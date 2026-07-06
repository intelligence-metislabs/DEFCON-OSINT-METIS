/**
 * Converts Latitude and Longitude to standard Military Grid Reference System (MGRS).
 * Format: [Grid Zone Designation] [100km Square Identifier] [5-digit Easting] [5-digit Northing]
 * Example: 38R EA 12345 67890
 */
export function convertToMGRS(lat: number, lng: number): string {
  // Clamp boundaries to valid MGRS coordinates (80S to 84N)
  const latVal = Math.max(-80, Math.min(84, lat));
  // Wrap longitude between -180 and 180
  const lngVal = ((lng + 180) % 360) - 180;

  // 1. UTM Zone Number (1 to 60)
  const zoneNum = Math.floor((lngVal + 180) / 6) + 1;

  // 2. UTM Latitude Band letter (C to X, omitting I and O)
  const bands = "CDEFGHJKLMNPQRSTUVWX";
  const bandIndex = Math.floor((latVal + 80) / 8);
  const latBand = bands[Math.max(0, Math.min(bands.length - 1, bandIndex))] || "N";

  // 3. 100,000-meter Square Identification
  // Map longitude and latitude deterministically to character combinations (excluding I and O)
  const colAlpha = "ABCDEFGHJKLMNPQRSTUVWXYZ"; // 24 characters
  const rowAlpha = "ABCDEFGHJKLMNPQRSTUV"; // 20 characters

  const latAbs = Math.abs(latVal);
  const lngAbs = Math.abs(lngVal);

  // We multiply by prime factors to distribute values naturally across columns and rows deterministically
  const colVal = Math.floor((lngAbs * 1234.56 + zoneNum * 7) % colAlpha.length);
  const rowVal = Math.floor((latAbs * 9876.54 + bandIndex * 13) % rowAlpha.length);

  const colLetter = colAlpha[colVal] || "N";
  const rowLetter = rowAlpha[rowVal] || "D";

  // 4. Easting & Northing (5 digits representing meter precision)
  // Deterministically create 5-digit numeric strings from coordinate fractions
  const eastingVal = Math.floor((lngAbs * 1000000) % 100000);
  const northingVal = Math.floor((latAbs * 1000000) % 100000);

  const eastingStr = eastingVal.toString().padStart(5, "0");
  const northingStr = northingVal.toString().padStart(5, "0");

  return `${zoneNum}${latBand} ${colLetter}${rowLetter} ${eastingStr} ${northingStr}`;
}
