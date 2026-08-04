/**
 * OBD-II over Web Bluetooth (ELM327 BLE dongles).
 *
 * Real ELM327 BLE dongles (Vgate iCar Pro BLE, VEEPEAK BLE+, LELink, etc.)
 * expose one of a few well-known GATT services with paired
 * notify(TX)/write(RX) characteristics. Classic-Bluetooth SPP dongles
 * cannot be used from a browser — Web Bluetooth is BLE-only.
 *
 * Client-only. Do not import from server code.
 */

export type ObdPid =
  | "rpm"
  | "speed"
  | "coolant"
  | "throttle"
  | "engine_load"
  | "intake_temp"
  | "maf"
  | "voltage";

export type ObdReading = {
  pid: ObdPid;
  value: number;
  unit: string;
  at: number;
};

export type ObdEvent =
  | { type: "log"; line: string }
  | { type: "reading"; reading: ObdReading }
  | { type: "dtc"; codes: string[] }
  | {
      type: "status";
      state: "idle" | "scanning" | "connecting" | "ready" | "disconnected" | "error";
      message?: string;
    };

type Listener = (e: ObdEvent) => void;

const SERVICE_CANDIDATES: { service: string; write: string; notify: string; label: string }[] = [
  // Vgate / most cheap BLE ELM327
  { service: 0xfff0 as any, write: 0xfff2 as any, notify: 0xfff1 as any, label: "FFF0" },
  // Nordic UART-style clones
  { service: 0xffe0 as any, write: 0xffe1 as any, notify: 0xffe1 as any, label: "FFE0" },
];

const PID_DECODERS: Record<
  ObdPid,
  { cmd: string; decode: (b: number[]) => number; unit: string; label: string }
> = {
  rpm: { cmd: "010C", unit: "rpm", label: "RPM", decode: (b) => ((b[0] << 8) + b[1]) / 4 },
  speed: { cmd: "010D", unit: "km/h", label: "Speed", decode: (b) => b[0] },
  coolant: { cmd: "0105", unit: "°C", label: "Coolant", decode: (b) => b[0] - 40 },
  throttle: { cmd: "0111", unit: "%", label: "Throttle", decode: (b) => (b[0] * 100) / 255 },
  engine_load: { cmd: "0104", unit: "%", label: "Engine Load", decode: (b) => (b[0] * 100) / 255 },
  intake_temp: { cmd: "010F", unit: "°C", label: "Intake", decode: (b) => b[0] - 40 },
  maf: { cmd: "0110", unit: "g/s", label: "MAF", decode: (b) => ((b[0] << 8) + b[1]) / 100 },
  voltage: { cmd: "ATRV", unit: "V", label: "Battery", decode: (b) => b[0] }, // handled specially
};

export const PID_META = PID_DECODERS;

export function isWebBluetoothSupported() {
  return typeof navigator !== "undefined" && !!(navigator as any).bluetooth;
}

export class ObdClient {
  private device: any = null;
  private server: any = null;
  private write: any = null;
  private notify: any = null;
  private listeners = new Set<Listener>();
  private buf = "";
  private queue: { cmd: string; resolve: (s: string) => void; reject: (e: any) => void }[] = [];
  private busy = false;
  private stopped = false;

  on(fn: Listener) {
    this.listeners.add(fn);
    return () => this.listeners.delete(fn);
  }
  private emit(e: ObdEvent) {
    for (const l of this.listeners) l(e);
  }
  private log(line: string) {
    this.emit({ type: "log", line });
  }

  async connect() {
    if (!isWebBluetoothSupported()) {
      this.emit({ type: "status", state: "error", message: "Web Bluetooth not supported" });
      throw new Error("Web Bluetooth not supported");
    }
    this.emit({ type: "status", state: "scanning" });
    const filters = SERVICE_CANDIDATES.map((c) => ({ services: [c.service] }));
    const namePrefixes = [
      { namePrefix: "OBD" },
      { namePrefix: "VEEPEAK" },
      { namePrefix: "Vgate" },
      { namePrefix: "iCar" },
      { namePrefix: "LELink" },
    ];
    const device = await (navigator as any).bluetooth.requestDevice({
      filters: [...filters, ...namePrefixes],
      optionalServices: SERVICE_CANDIDATES.map((c) => c.service),
    });
    this.device = device;
    device.addEventListener("gattserverdisconnected", () => {
      this.emit({ type: "status", state: "disconnected" });
    });
    this.emit({ type: "status", state: "connecting", message: device.name || "device" });
    this.server = await device.gatt.connect();

    let chosen: (typeof SERVICE_CANDIDATES)[number] | null = null;
    for (const c of SERVICE_CANDIDATES) {
      try {
        const svc = await this.server.getPrimaryService(c.service);
        this.write = await svc.getCharacteristic(c.write);
        this.notify = await svc.getCharacteristic(c.notify);
        chosen = c;
        break;
      } catch {
        /* try next */
      }
    }
    if (!chosen) {
      this.emit({ type: "status", state: "error", message: "No known OBD service on this dongle" });
      throw new Error("No known OBD service");
    }
    this.log(`Bound to ${chosen.label}`);
    await this.notify.startNotifications();
    this.notify.addEventListener("characteristicvaluechanged", (ev: any) =>
      this.onData(ev.target.value),
    );

    // ELM327 handshake
    await this.raw("ATZ", 1500);
    await this.raw("ATE0"); // echo off
    await this.raw("ATL0"); // linefeeds off
    await this.raw("ATS0"); // spaces off
    await this.raw("ATSP0"); // auto protocol
    const id = await this.raw("ATI").catch(() => "?");
    this.log(`ELM: ${id}`);
    this.emit({ type: "status", state: "ready" });
  }

  async disconnect() {
    this.stopped = true;
    try {
      await this.notify?.stopNotifications();
    } catch {}
    try {
      this.server?.disconnect();
    } catch {}
    this.device = null;
    this.emit({ type: "status", state: "disconnected" });
  }

  private onData(view: DataView) {
    const dec = new TextDecoder();
    this.buf += dec.decode(view.buffer);
    let idx: number;
    while ((idx = this.buf.indexOf(">")) !== -1) {
      const chunk = this.buf.slice(0, idx).replace(/\r|\n/g, " ").trim();
      this.buf = this.buf.slice(idx + 1);
      const cur = this.queue.shift();
      if (cur) cur.resolve(chunk);
      this.busy = false;
      this.pump();
    }
  }

  private pump() {
    if (this.busy) return;
    const next = this.queue[0];
    if (!next) return;
    this.busy = true;
    const bytes = new TextEncoder().encode(next.cmd + "\r");
    this.write.writeValueWithoutResponse
      ? this.write.writeValueWithoutResponse(bytes)
      : this.write.writeValue(bytes);
  }

  private raw(cmd: string, _timeout = 1500): Promise<string> {
    return new Promise((resolve, reject) => {
      this.queue.push({ cmd, resolve, reject });
      this.pump();
    });
  }

  async readPid(pid: ObdPid): Promise<ObdReading | null> {
    const meta = PID_DECODERS[pid];
    const resp = await this.raw(meta.cmd).catch(() => "");
    let value = NaN;
    if (pid === "voltage") {
      const m = resp.match(/([0-9]+\.?[0-9]*)V/i);
      if (m) value = parseFloat(m[1]);
    } else {
      // Response looks like "41 0C 1A F8" (mode+40, pid, data...)
      const clean = resp.replace(/[^0-9A-F ]/gi, "").trim();
      const parts = clean.split(/\s+/).filter(Boolean);
      const pidHex = meta.cmd.slice(2);
      const startIdx = parts.findIndex((p) => p === pidHex);
      if (startIdx > 0 && parts[startIdx - 1].toUpperCase() === "41") {
        const data = parts.slice(startIdx + 1).map((h) => parseInt(h, 16));
        try {
          value = meta.decode(data);
        } catch {
          value = NaN;
        }
      }
    }
    if (!isFinite(value)) return null;
    const reading = { pid, value: Math.round(value * 100) / 100, unit: meta.unit, at: Date.now() };
    this.emit({ type: "reading", reading });
    return reading;
  }

  async readDtcs(): Promise<string[]> {
    const resp = await this.raw("03").catch(() => "");
    const clean = resp.replace(/[^0-9A-F ]/gi, "").trim();
    const parts = clean.split(/\s+/).filter(Boolean);
    // 43 XX XX YY YY ZZ ZZ ...
    const idx = parts.findIndex((p) => p === "43");
    if (idx < 0) return [];
    const codes: string[] = [];
    for (let i = idx + 1; i + 1 < parts.length; i += 2) {
      const a = parseInt(parts[i], 16),
        b = parseInt(parts[i + 1], 16);
      if (a === 0 && b === 0) continue;
      const first = (a & 0xc0) >> 6;
      const type = ["P", "C", "B", "U"][first];
      const digit = ((a & 0x30) >> 4).toString();
      const rest = ((a & 0x0f).toString(16) + parts[i + 1].toLowerCase()).padStart(3, "0");
      codes.push(`${type}${digit}${rest}`.toUpperCase());
    }
    this.emit({ type: "dtc", codes });
    return codes;
  }

  async clearDtcs() {
    await this.raw("04").catch(() => "");
  }

  isConnected() {
    return !!this.device?.gatt?.connected;
  }
}

/** Simulated readings for the demo/preview mode (no dongle). */
export function createDemoStream(cb: (r: ObdReading) => void) {
  let rpm = 900,
    speed = 0,
    coolant = 55,
    load = 22,
    thr = 8,
    intake = 30,
    maf = 3.2,
    volt = 13.9;
  let t = 0;
  const id = setInterval(() => {
    t += 1;
    const s = Math.sin(t / 6),
      n = Math.random() - 0.5;
    rpm = Math.max(850, Math.min(9200, 3200 + s * 2400 + n * 400));
    speed = Math.max(0, Math.min(180, 60 + s * 45 + n * 8));
    coolant = Math.min(96, coolant + 0.05);
    load = Math.max(10, Math.min(98, 45 + s * 30 + n * 10));
    thr = Math.max(0, Math.min(100, 25 + s * 25 + n * 6));
    intake = Math.max(20, Math.min(58, 34 + n * 3));
    maf = Math.max(1, Math.min(45, 12 + s * 9 + n * 2));
    volt = 13.9 + n * 0.15;
    const now = Date.now();
    cb({ pid: "rpm", value: Math.round(rpm), unit: "rpm", at: now });
    cb({ pid: "speed", value: Math.round(speed), unit: "km/h", at: now });
    cb({ pid: "coolant", value: Math.round(coolant), unit: "°C", at: now });
    cb({ pid: "engine_load", value: Math.round(load), unit: "%", at: now });
    cb({ pid: "throttle", value: Math.round(thr), unit: "%", at: now });
    cb({ pid: "intake_temp", value: Math.round(intake), unit: "°C", at: now });
    cb({ pid: "maf", value: Math.round(maf * 10) / 10, unit: "g/s", at: now });
    cb({ pid: "voltage", value: Math.round(volt * 10) / 10, unit: "V", at: now });
  }, 500);
  return () => clearInterval(id);
}
