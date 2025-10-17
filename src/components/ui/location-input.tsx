"use client";

import { useEffect, useRef, useState } from "react";
import { importLibrary, setOptions } from "@googlemaps/js-api-loader";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { MapPin, Navigation } from "lucide-react";
import { toast } from "sonner";

export interface LocationData {
  displayText: string; // Short display (e.g., "London, UK" or "SW1A 1AA")
  formattedAddress: string; // Full address from Google
  latitude: number;
  longitude: number;
  city?: string;
  postcode?: string;
}

interface LocationInputProps {
  value?: LocationData | null;
  onChange: (location: LocationData | null) => void;
  placeholder?: string;
  disabled?: boolean;
  className?: string;
}

export function LocationInput({
  value,
  onChange,
  placeholder = "Enter location or use current location",
  disabled = false,
  className = "",
}: Readonly<LocationInputProps>) {
  const inputRef = useRef<HTMLInputElement>(null);
  const autocompleteRef = useRef<google.maps.places.Autocomplete | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isGettingLocation, setIsGettingLocation] = useState(false);
  const [displayValue, setDisplayValue] = useState(value?.displayText || "");

  // Initialize Google Places Autocomplete
  useEffect(() => {
    const apiKey = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY;
    
    if (!apiKey) {
      console.warn("Google Maps API key not found. Location autocomplete disabled.");
      return;
    }

    if (!inputRef.current) return;

    setIsLoading(true);

    // Set Google Maps API options
    setOptions({
      key: apiKey,
      v: "weekly",
      libraries: ["places"],
    });

    // Use the modern functional API
    (async () => {
      try {
        await importLibrary("places");
        
        if (!inputRef.current) return;

        // Create autocomplete with UK bias
        autocompleteRef.current = new google.maps.places.Autocomplete(
          inputRef.current,
          {
            componentRestrictions: { country: "gb" }, // UK only
            fields: [
              "formatted_address",
              "geometry",
              "address_components",
              "name",
            ],
            types: ["geocode", "establishment"], // Allow both addresses and places
          }
        );

        // Listen for place selection
        autocompleteRef.current.addListener("place_changed", () => {
          const place = autocompleteRef.current?.getPlace();

          if (!place?.geometry?.location) {
            toast.error("Unable to get location details");
            return;
          }

          const locationData = extractLocationData(place);
          setDisplayValue(locationData.displayText);
          onChange(locationData);
        });

        setIsLoading(false);
      } catch (error) {
        console.error("Error loading Google Maps:", error);
        toast.error("Failed to load location services");
        setIsLoading(false);
      }
    })();

    return () => {
      if (autocompleteRef.current) {
        google.maps.event.clearInstanceListeners(autocompleteRef.current);
      }
    };
  }, [onChange]);

  // Update display when value changes externally
  useEffect(() => {
    if (value) {
      setDisplayValue(value.displayText);
    } else {
      setDisplayValue("");
    }
  }, [value]);

  // Extract structured data from Google Place
  const extractLocationData = (
    place: google.maps.places.PlaceResult
  ): LocationData => {
    const lat = place.geometry!.location!.lat();
    const lng = place.geometry!.location!.lng();
    const formattedAddress = place.formatted_address || "";

    // Extract city and postcode from address components
    let city: string | undefined;
    let postcode: string | undefined;

    if (place.address_components) {
      for (const component of place.address_components) {
        if (component.types.includes("postal_town")) {
          city = component.long_name;
        } else if (component.types.includes("locality") && !city) {
          city = component.long_name;
        } else if (component.types.includes("postal_code")) {
          postcode = component.long_name;
        }
      }
    }

    // Create a shorter display text
    const displayText = postcode || city || place.name || formattedAddress.split(",")[0];

    return {
      displayText,
      formattedAddress,
      latitude: lat,
      longitude: lng,
      city,
      postcode,
    };
  };

  // Use browser geolocation to get current position
  const handleUseCurrentLocation = () => {
    if (!navigator.geolocation) {
      toast.error("Geolocation is not supported by your browser");
      return;
    }

    setIsGettingLocation(true);

    navigator.geolocation.getCurrentPosition(
      async (position) => {
        try {
          const { latitude, longitude } = position.coords;

          // Reverse geocode to get address
          const apiKey = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY;
          if (!apiKey) {
            toast.error("Location services not configured");
            setIsGettingLocation(false);
            return;
          }

          // Ensure google maps is loaded
          if (!globalThis.google?.maps) {
            toast.error("Location services not ready");
            setIsGettingLocation(false);
            return;
          }

          const geocoder = new google.maps.Geocoder();
          geocoder.geocode(
            { location: { lat: latitude, lng: longitude } },
            (
              results: google.maps.GeocoderResult[] | null,
              status: google.maps.GeocoderStatus
            ) => {
              if (status === "OK" && results?.[0]) {
                const locationData = extractLocationData(results[0]);
                setDisplayValue(locationData.displayText);
                onChange(locationData);
                toast.success("Location detected!");
              } else {
                toast.error("Unable to determine address from location");
              }
              setIsGettingLocation(false);
            }
          );
        } catch (error) {
          console.error("Geocoding error:", error);
          toast.error("Failed to get address from location");
          setIsGettingLocation(false);
        }
      },
      (error) => {
        console.error("Geolocation error:", error);
        
        if (error.code === error.PERMISSION_DENIED) {
          toast.error("Location permission denied. Please enable in browser settings.");
        } else if (error.code === error.POSITION_UNAVAILABLE) {
          toast.error("Location information unavailable");
        } else {
          toast.error("Failed to get current location");
        }
        
        setIsGettingLocation(false);
      },
      {
        enableHighAccuracy: true,
        timeout: 10000,
        maximumAge: 0,
      }
    );
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newValue = e.target.value;
    setDisplayValue(newValue);
    
    // Clear the structured data if user is typing
    if (!newValue) {
      onChange(null);
    }
  };

  return (
    <div className={`flex gap-2 ${className}`}>
      <div className="relative flex-1">
        <MapPin className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          ref={inputRef}
          value={displayValue}
          onChange={handleInputChange}
          placeholder={isLoading ? "Loading location services..." : placeholder}
          disabled={disabled || isLoading}
          className="pl-10"
        />
      </div>
      <Button
        type="button"
        variant="outline"
        size="icon"
        onClick={handleUseCurrentLocation}
        disabled={disabled || isLoading || isGettingLocation}
        title="Use current location"
      >
        <Navigation className={`h-4 w-4 ${isGettingLocation ? "animate-pulse" : ""}`} />
      </Button>
    </div>
  );
}
