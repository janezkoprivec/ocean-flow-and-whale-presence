/**
 * API service for interacting with the ECCO Reanalysis API
 * API Documentation: https://ioi-project-api.svarog.top/docs
 * 
 * For local development:
 * - Run API locally: uvicorn app.main:app --reload --host 127.0.0.1 --port 8000
 * - Vite proxy forwards /api/* to http://127.0.0.1:8000
 */

// Use proxy in development to avoid CORS issues
// Development: /api (proxied to http://127.0.0.1:8000)
// Production: https://ioi-project-api.svarog.top
const API_BASE_URL = import.meta.env.DEV ? "/api" : "https://ioi-project-api.svarog.top";

export type Variable = "so" | "thetao"; // so = salinity, thetao = temperature
export type OutputFormat = "netcdf" | "json";

export interface SubsetParams {
  /** Dataset key (default: "reanalysis") */
  dataset?: string;
  /** Variable to extract: "so" (salinity) or "thetao" (temperature) */
  variable: Variable;
  /** Minimum longitude (-180 to 180) */
  min_lon: number;
  /** Maximum longitude (-180 to 180) */
  max_lon: number;
  /** Minimum latitude (-90 to 90) */
  min_lat: number;
  /** Maximum latitude (-90 to 90) */
  max_lat: number;
  /** ISO timestamp or YYYY-MM-DD; nearest match used */
  time?: string;
  /** Depth value; nearest match used */
  depth?: number;
  /** Spatial decimation factor (1=full res, 4=every 4th point). Default: 1 */
  stride?: number;
  /** Output format: "netcdf" or "json". Default: "netcdf" */
  fmt?: OutputFormat;
}

export interface SubsetResponse {
  // Response structure will depend on the format (json vs netcdf)
  // For JSON format, this would contain the data points
  data?: any;
  metadata?: {
    variable: string;
    time?: string;
    depth?: number;
    bounds: {
      min_lon: number;
      max_lon: number;
      min_lat: number;
      max_lat: number;
    };
  };
}

/**
 * Fetch a subset of ECCO reanalysis data
 * @param params - Parameters for the subset query
 * @returns Response data in the specified format
 */
export async function fetchSubset(params: SubsetParams): Promise<SubsetResponse | Blob> {
  // Validate required parameters
  if (!params.variable) {
    throw new Error("Variable parameter is required (so or thetao)");
  }
  if (params.min_lon === undefined || params.max_lon === undefined) {
    throw new Error("Longitude bounds (min_lon, max_lon) are required");
  }
  if (params.min_lat === undefined || params.max_lat === undefined) {
    throw new Error("Latitude bounds (min_lat, max_lat) are required");
  }

  // Validate ranges
  if (params.min_lon < -180 || params.min_lon > 180 || params.max_lon < -180 || params.max_lon > 180) {
    throw new Error("Longitude must be between -180 and 180");
  }
  if (params.min_lat < -90 || params.min_lat > 90 || params.max_lat < -90 || params.max_lat > 90) {
    throw new Error("Latitude must be between -90 and 90");
  }
  if (params.stride !== undefined && (params.stride < 1 || params.stride > 50)) {
    throw new Error("Stride must be between 1 and 50");
  }

  // Build query parameters
  const queryParams = new URLSearchParams();
  
  // Set defaults
  queryParams.append("dataset", params.dataset || "reanalysis");
  queryParams.append("variable", params.variable);
  queryParams.append("min_lon", params.min_lon.toString());
  queryParams.append("max_lon", params.max_lon.toString());
  queryParams.append("min_lat", params.min_lat.toString());
  queryParams.append("max_lat", params.max_lat.toString());
  
  // Optional parameters
  if (params.time) {
    queryParams.append("time", params.time);
  }
  if (params.depth !== undefined) {
    queryParams.append("depth", params.depth.toString());
  }
  if (params.stride) {
    queryParams.append("stride", params.stride.toString());
  }
  if (params.fmt) {
    queryParams.append("fmt", params.fmt);
  }

  const url = `${API_BASE_URL}/subset?${queryParams.toString()}`;
  
  // Log full URL for caching
  console.log('CACHE REQUEST URL',url);

  try {
    const response = await fetch(url);

    if (!response.ok) {
      throw new Error(`API request failed: ${response.status} ${response.statusText}`);
    }

    // If requesting netcdf format, return as Blob
    if (params.fmt === "netcdf" || !params.fmt) {
      return await response.blob();
    }

    // Otherwise parse as JSON
    return await response.json();
  } catch (error) {
    console.error("Error fetching subset data:", error);
    throw error;
  }
}

/**
 * Fetch temperature data for a given region and time
 */
export async function fetchTemperature(
  bounds: { min_lon: number; max_lon: number; min_lat: number; max_lat: number },
  time?: string,
  depth?: number,
  stride: number = 1
): Promise<SubsetResponse | Blob> {
  return fetchSubset({
    variable: "thetao",
    ...bounds,
    time,
    depth,
    stride,
    fmt: "json"
  });
}

/**
 * Fetch salinity data for a given region and time
 */
export async function fetchSalinity(
  bounds: { min_lon: number; max_lon: number; min_lat: number; max_lat: number },
  time?: string,
  depth?: number,
  stride: number = 1
): Promise<SubsetResponse | Blob> {
  return fetchSubset({
    variable: "so",
    ...bounds,
    time,
    depth,
    stride,
    fmt: "json"
  });
}

/**
 * Fetch data for whale habitat analysis
 * Gets both temperature and salinity for a whale location
 */
export async function fetchWhaleHabitatData(
  lon: number,
  lat: number,
  time: string,
  depth?: number,
  bufferDegrees: number = 1.0
): Promise<{ temperature: SubsetResponse | Blob; salinity: SubsetResponse | Blob }> {
  const bounds = {
    min_lon: lon - bufferDegrees,
    max_lon: lon + bufferDegrees,
    min_lat: lat - bufferDegrees,
    max_lat: lat + bufferDegrees
  };

  const [temperature, salinity] = await Promise.all([
    fetchTemperature(bounds, time, depth, 4), // Use stride=4 for faster response
    fetchSalinity(bounds, time, depth, 4)
  ]);

  return { temperature, salinity };
}

export default {
  fetchSubset,
  fetchTemperature,
  fetchSalinity,
  fetchWhaleHabitatData
};

