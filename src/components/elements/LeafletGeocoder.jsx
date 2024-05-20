// LeafletControlGeocoder.jsx
import React, { useEffect, useState } from "react";
import { useMap } from "react-leaflet";
import "leaflet-control-geocoder/dist/Control.Geocoder.css";
import "leaflet-control-geocoder/dist/Control.Geocoder.js";
import L from "leaflet";

import icon from "./constants";

const LeafletControlGeocoder = ({ onLocationSelect }) => {
  const map = useMap();
  const [selectedLocation, setSelectedLocation] = useState(null);

  useEffect(() => {
    var geocoder = L.Control.Geocoder.nominatim();
    if (typeof URLSearchParams !== "undefined" && location.search) {
      var params = new URLSearchParams(location.search);
      var geocoderString = params.get("geocoder");
      if (geocoderString && L.Control.Geocoder[geocoderString]) {
        geocoder = L.Control.Geocoder[geocoderString]();
      } else if (geocoderString) {
        console.warn("Unsupported geocoder", geocoderString);
      }
    }

    L.Control.geocoder({
      query: "",
      placeholder: "Search here...",
      defaultMarkGeocode: false,
      geocoder
    })
    .on("markgeocode", function (e) {
      var latlng = e.geocode.center;
      var locationName = e.geocode.name; // Extract location name from geocode result
      if (latlng) {
        // Ensure latlng is defined before passing it to onLocationSelect
        onLocationSelect(latlng, locationName); // Pass both coordinates and location name
        L.marker(latlng, { icon })
          .addTo(map)
          .bindPopup(e.geocode.name)
          .openPopup();
        map.fitBounds(e.geocode.bbox);
      } else {
        console.error("Selected location is undefined");
      }
    })
      .addTo(map);
  }, [map, onLocationSelect]);

  return null;
};


export default LeafletControlGeocoder;
