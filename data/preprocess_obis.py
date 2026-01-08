import pandas as pd
import json
from pathlib import Path

# ---- nastavitve ----
INPUT_OCC = Path("/Users/pikakriznar/Documents/1_letnik_MAG/IOI/Projekt/82bf67a2-870f-4a6e-adce-1192a840eb87/Occurrence.tsv")  # dajte file v root ali popravite pot
OUT_DIR = Path("data")
OUT_DIR.mkdir(exist_ok=True)

# Europe + North Atlantic (prilagodite po želji)
BBOX = {
    "min_lon": -35,
    "max_lon":  40,
    "min_lat":  30,
    "max_lat":  75
}

USECOLS = [
    "decimalLatitude", "decimalLongitude",
    "eventDate", "year", "month", "day",
    "scientificName", "vernacularName",
    "basisOfRecord", "datasetName", "occurrenceID"
]

def in_bbox(df):
    return (
        (df["decimalLongitude"].between(BBOX["min_lon"], BBOX["max_lon"])) &
        (df["decimalLatitude"].between(BBOX["min_lat"], BBOX["max_lat"]))
    )

def to_geojson(df, out_path):
    features = []
    for _, r in df.iterrows():
        props = {
            "species": (r.get("vernacularName") or r.get("scientificName") or "Unknown"),
            "scientificName": r.get("scientificName"),
            "vernacularName": r.get("vernacularName"),
            "eventDate": r.get("eventDate"),
            "year": int(r["year"]) if pd.notna(r["year"]) else None,
            "month": int(r["month"]) if pd.notna(r["month"]) else None,
            "day": int(r["day"]) if pd.notna(r["day"]) else None,
            "basisOfRecord": r.get("basisOfRecord"),
            "datasetName": r.get("datasetName"),
            "occurrenceID": str(r.get("occurrenceID"))
        }
        feat = {
            "type": "Feature",
            "geometry": {
                "type": "Point",
                "coordinates": [float(r["decimalLongitude"]), float(r["decimalLatitude"])]
            },
            "properties": props
        }
        features.append(feat)

    geo = {"type": "FeatureCollection", "features": features}
    out_path.write_text(json.dumps(geo), encoding="utf-8")
    print(f"Wrote {out_path} ({len(features)} features)")

def main():
    print("Reading Occurrence.tsv (this can take a bit)...")
    df = pd.read_csv(INPUT_OCC, sep="\t", usecols=USECOLS, low_memory=False)

    # basic cleanup
    df = df.dropna(subset=["decimalLatitude", "decimalLongitude", "year", "month"])
    df = df[in_bbox(df)]

    # normalize species label
    df["species"] = df["vernacularName"].fillna(df["scientificName"]).fillna("Unknown")

    # output full range (2010–2013) within bbox
    df_2010_2013 = df[(df["year"] >= 2010) & (df["year"] <= 2013)].copy()
    to_geojson(df_2010_2013, OUT_DIR / "whales_2010_2013.geojson")

    # output aligned range to ECCO (2011–2012)
    df_2011_2012 = df[(df["year"] >= 2011) & (df["year"] <= 2012)].copy()
    to_geojson(df_2011_2012, OUT_DIR / "whales_2011_2012.geojson")

    # monthly counts for D3 heatmap (all species + also by species if želite)
    monthly = (
        df_2011_2012
        .groupby(["year", "month"])
        .size()
        .reset_index(name="count")
        .sort_values(["year", "month"])
    )
    monthly.to_csv(OUT_DIR / "whales_monthly_counts.csv", index=False)
    print("Wrote data/whales_monthly_counts.csv")

if __name__ == "__main__":
    main()
