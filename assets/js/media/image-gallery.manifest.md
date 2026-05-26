# Gallery Manifest v1

Format for JSON manifests consumed by `image-gallery.js`
(admin portal, paintings pipeline, future generators)

## Example

```json
{
  "version": 1,
  "name": "Photos",
  "description": "optional human-readable blurb",
  "base_url": "https://media.manik.cc/photos",

  "items": [
    {
      "id": "beach-001.jpg",
      "title": "",
      "year": "",
      "thumb": "thumbs/beach-001.jpg",
      "full":  "full/beach-001.jpg",
      "width": 2000,
      "height": 1333,
      "tags": [],
      "popularity": { "score": 0 },
      "meta": {
        "Camera": "Canon AE-1", // if photography
        "Film": "Portra 400"
        "Series": "Amazing Art Series" // if artist
        "whatever": "can go here" 
      },
      "extras": {}
    }
  ],

  "editor": {
    "fields": [
      { "name": "Camera", "values": ["Canon AE-1", "Pentax"] }
    ]
  },

  "source": {
    "generator": "admin-portal",
    "generated": "2026-05-25T00:00:00Z"
  }
}
```

## Render contract

These are the only fields `image-gallery.js` should need to read to render sorting/filtering properly.

### Top-level

| Field         | Type     | Notes                                                  |
| ------------- | -------- | ------------------------------------------------------ |
| `version`     | number   | Manifest schema version. Currently `1`.                |
| `name`        | string   | Optional display name.                                 |
| `description` | string   | Optional blurb. Not currently rendered by the gallery. |
| `base_url`    | string   | Optional. Prepended to relative `thumb`/`full`.        |
| `items`       | array    | The gallery items. Required.                           |

### Per-item

| Field        | Type           | Notes                                                                              |
| ------------ | -------------- | ---------------------------------------------------------------------------------- |
| `id`         | string         | Stable identifier. Used for dedup/keys; not displayed.                             |
| `title`      | string         | Shown in captions when `show_captions` is enabled.                                 |
| `year`       | string         | Free-form ("1872", "c. 1870"). 4-digit year is regex-extracted for decade filter.  |
| `thumb`      | string         | URL. Absolute, or relative to `base_url`.                                          |
| `full`       | string         | URL. Falls back to `thumb` if absent.                                              |
| `width`      | number         | Pixel width of `full`. Used for masonry aspect ratio.                              |
| `height`     | number         | Pixel height of `full`.                                                            |
| `tags`       | string[]       | Free-form tags. Searchable; not currently filterable.                              |
| `popularity` | object         | `{ score: number, ...generator-specific }`. Only `score` is read by the renderer.  |
| `meta`       | object         | `{ [fieldName: string]: string }`. Filter dimensions live here. See below.         |
| `extras`     | object         | Reserved for generator-specific data the renderer must ignore.                     |

## Filter and sort conventions

The Liquid include drives which controls show up:

```liquid
{% include image-gallery.html
    source=".../manifest.json"
    sort_options="year-desc,year-asc,popularity-desc"
    filter_options="decade,meta:Series,meta:Collection"
%}
```

### Built-in filters

- `decade` — derived from `year` (e.g. `1872` → `1870s`).

### Meta filters

`meta:<FieldName>` — builds a filter from unique values of `item.meta[FieldName]`.
Works with any string-valued meta field. Examples:

- `meta:Camera`   for photos
- `meta:Series`   for paintings
- `meta:Whatever` for future uses 

### Sort options

- `year-desc`, `year-asc` — sorted by extracted 4-digit year, missing years last.
- `popularity-desc` — sorted by `popularity.score` descending.

## URL handling

- If `thumb`/`full` is absolute (`https://…`) or a data URL, used as-is.
- If relative, prepended with `base_url`.
- Either approach is fine, pick whichever fits the source.

## Namespaces (off-limits to the renderer)

Everything outside the render contract lives in one of these:

### `editor`

For tooling that edits the manifest. The admin portal stores its field schema here:

```json
"editor": {
  "fields": [
    { "name": "Camera", "values": ["Canon AE-1", "Pentax"] },
    { "name": "Location", "values": [] }
  ]
}
```

`fields[].values` is the preset list (dropdown choices); empty means free text.
Generators that don't have an editor (like the paintings pipeline) omit this.

### `source`

For generator-attached metadata: who built the manifest, when, and any
producer-specific top-level data:

```json
"source": {
  "generator": "pipelines-paintings",
  "generated": "2026-05-25T00:00:00Z",
  "artist": { "qid": "Q296", "name": "Claude Monet" },
  "work":   { "label": "paintings" },
  "count":  287
}
```

### `extras` (per-item)

Same idea as `source` but per-item. Anything a generator wants to preserve for
its own round-tripping that isn't for display.

```json
"extras": {
  "qid": "Q...",
  "catalog_number": "w-1234",
  "dimensions_cm": { "width": 50, "height": 48 },
  "iiif": "...",
  "license": "..."
}
```

## Producer notes

### Admin portal (R2 albums)

- Populates `editor.fields`, uses `meta` heavily.
- Relative URLs, sets `base_url`.
- `series`, `collection`, `popularity` typically absent.

### Paintings pipeline

- Absolute Wikimedia URLs, omits `base_url`.
- Populates `meta.Series`, `meta.Collection`, `popularity.score` + breakdown.
- Stashes Wikidata identifiers and physical dimensions in `extras`.
- Stashes `artist`, `work`, `count` in `source`.

## Versioning

`version` is required. Breaking changes bump the version; the renderer is allowed
to refuse manifests it doesn't understand. Additive changes (new optional fields)
don't bump the version.
