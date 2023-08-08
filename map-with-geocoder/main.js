// Amazon Location Service:
const apiKey = '<Amazon Location API key>';
const mapName = '<Amazon Location Map resource>';
const placesName = '<Amazon Location PlaceIndex resource>';
const region = '<AWS Region, e.g. eu-central-1>';

// Add Geocoder control to the map via callbacks that are called by maplibre-gl-geocoder.
// forwardGeocode: required for geocoding (Amazon Location SearchPlaceIndexForText API)
// getSuggestions + searchByPlaceId: required for autosugget (Amazon Location SearchPlaceIndexForSuggestions + GetPlace APIs)
async function addGeocoder(map, authHelper) {
  const amazonLocationGeocoderApi = {
    forwardGeocode: async (config) => {
      let features = [];
      try {
        // Set up parameters for search call
        const params = {
          IndexName: placesName,
          Text: config.query,
          Key: apiKey,
        };

        const client = new amazonLocationClient.LocationClient({
          region,
          ...authHelper.getLocationClientConfig(), // Provides configuration required to make requests to Amazon Location
        });

        // Set up command to call SearchPlaceIndexForText API
        const command = new amazonLocationClient.SearchPlaceIndexForTextCommand(params);
        const data = await client.send(command);

        // Convert the results to Carmen geojson to be returned to the MapLibre Geocoder
        features = data.Results.map((result) => ({
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
      let suggestions = [];
      try {
        // Set up parameters for search call
        const params = {
          IndexName: placesName,
          Text: config.query,
          Key: apiKey,
        };

        const client = new amazonLocationClient.LocationClient({
          region,
          ...authHelper.getLocationClientConfig(), // Provides configuration required to make requests to Amazon Location
        });

        // Set up a command to call SearchPlaceIndexForSuggestions API
        const command = new amazonLocationClient.SearchPlaceIndexForSuggestionsCommand(params);
        const data = await client.send(command);

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
        // Set up parameters for search call
        const params = {
          IndexName: placesName,
          PlaceId: config.query,
          Key: apiKey,
        };

        const client = new amazonLocationClient.LocationClient({
          region,
          ...authHelper.getLocationClientConfig(), // Provides configuration required to make requests to Amazon Location
        });

        // Set up command to call GetPlace API with a place Id of a selected suggestion
        const command = new amazonLocationClient.GetPlaceCommand(params);
        const data = await client.send(command);

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
  const mlglMap = new maplibregl.Map({
    container: 'map', // HTML element ID of map element
    center: [-123.1187, 49.2819], // Initial map centerpoint
    zoom: 16, // Initial map zoom
    style: `https://maps.geo.${region}.amazonaws.com/maps/v0/maps/${mapName}/style-descriptor?key=${apiKey}`, // Defines the appearance of the map and authenticates using an API key
  });

  // Add navigation control to the top left of the map
  mlglMap.addControl(new maplibregl.NavigationControl(), 'top-left');

  return mlglMap;
}

async function main() {
  // Create an authentication helper instance using an API key
  const authHelper = await amazonLocationAuthHelper.withAPIKey(apiKey);

  // Initialize map and add a geocoder to it.
  const map = await initializeMap();
  addGeocoder(map, authHelper);
}

main();
