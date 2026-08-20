/**
 * Server-only helpers for ride records.
 */

/** Confirms a vehicle belongs to the caller; returns null when unowned/missing. */
export async function ownedVehicleId(
  supabase: any,
  userId: string,
  vehicleId: string | null | undefined,
): Promise<string | null> {
  if (!vehicleId) return null;
  const { data } = await supabase
    .from("vehicles")
    .select("id")
    .eq("id", vehicleId)
    .eq("owner_id", userId)
    .is("deleted_at", null)
    .maybeSingle();
  return (data?.id as string | undefined) ?? null;
}
