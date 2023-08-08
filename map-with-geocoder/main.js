// Amazon Location Service Resources:
const Key = "<Amazon Location API key>";
const mapName = "<Amazon Location Map resource name>";
const IndexName = "<Amazon Location PlaceIndex resource name>";
const region = "<AWS Region, e.g., eu-central-1>";
// Add Geocoder control to the map via callbacks that are called by maplibre-gl-geocoder.
// forwardGeocode: required for geocoding (Amazon Location SearchPlaceIndexForText API)
// getSuggestions + searchByPlaceId: required for autosugget (Amazon Location SearchPlaceIndexForSuggestions + GetPlace APIs)
async function addGeocoder(map, authHelper, client) {
  const amazonLocationGeocoderApi = {
    forwardGeocode: async (config) => {
      try {
        // Set up command to call SearchPlaceIndexForText API
        const data = await client.send(new amazonLocationClient.SearchPlaceIndexForTextCommand({
          IndexName,
          Text: config.query,
          Key
          }));

        // Convert the results to Carmen geojson to be returned to the MapLibre Geocoder
        data.Results.map((result) => ({
          type: 'Feature',
          geometry: {
            type: 'Point',
            coordinates: result.Place.Geometry.Point,
          },
          place_name: result.Place.Label,
          properties: {
            id: result.Place.PlaceId,
          },
          text: result.Place.Label,
          place_type: ['place'],
          center: result.Place.Geometry.Point,
        }));
      } catch (e) {
        console.error(`Failed to forwardGeocode with error: ${e}`);
      }

      return {
        features,
      };
    },
    getSuggestions: async (config) => {
      try {
        // Set up a command to call SearchPlaceIndexForSuggestions API;
        const data = await client.send(new amazonLocationClient.SearchPlaceIndexForSuggestionsCommand({
          IndexName,
          Text: config.query,
          Key
          }));
        // Iterate over data.Results and return all suggestions and their place ids
        suggestions = data.Results.map((result) => ({
          text: result.Text,
          placeId: result.PlaceId,
        }));
      } catch (e) {
        console.error(`Failed to getSuggestions with error: ${e}`);
      }

      return {
        suggestions,
      };
    },
    searchByPlaceId: async (config) => {
      let feature;
      try {
        // Set up command to call GetPlace API with a place Id of a selected suggestion
        const data = await client.send(new amazonLocationClient.GetPlaceCommand({
          IndexName,
          PlaceId: config.query,
          Key
          }));

        feature = {
          type: 'Feature',
          geometry: {
            type: 'Point',
            coordinates: data.Place.Geometry.Point,
          },
          place_name: data.Place.Label,
          text: data.Place.Label,
          center: data.Place.Geometry.Point,
        };
      } catch (e) {
        console.error(`Failed to searchByPlaceId with error: ${e}`);
      }

      return {
        place: feature,
      };
    },
  };

  // Add Geocoder control to the map
  map.addControl(new MaplibreGeocoder(amazonLocationGeocoderApi, { maplibregl, showResultsWhileTyping: true }));
}

// Initialize a map
async function initializeMap() {
  const map = new maplibregl.Map({
    container: 'map', // HTML element ID of map element
    center: [-123.1187, 49.2819], // Initial map centerpoint
    zoom: 16, // Initial map zoom
    style: `https://maps.geo.${region}.amazonaws.com/maps/v0/maps/${mapName}/style-descriptor?key=${Key}`, // Defines the appearance of the map and authenticates using an API key
  });

  // Add navigation control to the top left of the map
  map.addControl(new maplibregl.NavigationControl(), 'top-left');

  return map;
}

async function main() {
  // Create an authentication helper instance using an API key
  const authHelper = await amazonLocationAuthHelper.withAPIKey(Key);
  const client = new amazonLocationClient.LocationClient({
    region,
    ...authHelper.getLocationClientConfig(), // Provides configuration required to make requests to Amazon Location
  });
  // Initialize map and add a geocoder to it.
  const map = await initializeMap();
  addGeocoder(map, authHelper, client);
}

main();
