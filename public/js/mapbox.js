// Mapbox is used to create the map on the frontend in each tour page. mapbox.com
// Check username and password in your usual file.

export const displayMap = (locations) => {
  mapboxgl.accessToken =
    'pk.eyJ1IjoicGVrYXkxMyIsImEiOiJjbDBnbzNwZTgwMGxpM2JsZWttajNtNzc2In0.jhxDJcyftS7xhTHhscIoaA';

  var map = new mapboxgl.Map({
    container: 'map',
    style: 'mapbox://styles/pekay13/cl0gpke0r000814pmn1qmjeam',
    scrollZoom: false,
    //   center: [-118.122019, 34.104067],
    //   zoom: 4,
    //   interactive: false,
  });

  const bounds = new mapboxgl.LngLatBounds();

  locations.forEach((loc) => {
    // Create the marker
    const el = document.createElement('div');
    el.className = 'marker';

    // Add the marker to the map
    new mapboxgl.Marker({
      element: el,
      anchor: 'bottom',
    })
      .setLngLat(loc.coordinates)
      .addTo(map);

    // Add popup of location name while hovering over the marker in the map
    new mapboxgl.Popup({
      offset: 30,
    })
      .setLngLat(loc.coordinates)
      .setHTML(`<p>Day ${loc.day}: ${loc.description}</p>`)
      .addTo(map);

    // Extend map bounds to include current location
    bounds.extend(loc.coordinates);
  });

  map.fitBounds(bounds, {
    padding: {
      top: 200,
      bottom: 150,
      left: 100,
      right: 100,
    },
  });
};
