"use client";

import { useEffect, useRef, useState } from "react";
import { importLibrary, setOptions } from "@googlemaps/js-api-loader";
import { Button } from "@/components/ui/button";
import { Navigation } from "lucide-react";
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

// Declare custom element type for PlaceAutocompleteElement
/* eslint-disable @typescript-eslint/no-namespace */
declare global {
  namespace JSX {
    interface IntrinsicElements {
      'gmp-place-autocomplete': React.DetailedHTMLProps<React.HTMLAttributes<HTMLElement>, HTMLElement> & {
        'component-restrictions'?: string;
        types?: string;
        placeholder?: string;
      };
    }
  }
}
/* eslint-enable @typescript-eslint/no-namespace */

export function LocationInput({
  value,
  onChange,
  placeholder = "Enter location or use current location",
  disabled = false,
  className = "",
}: Readonly<LocationInputProps>) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isGettingLocation, setIsGettingLocation] = useState(false);

  // Initialize Google Places Autocomplete Element
  useEffect(() => {
    const apiKey = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY;
    
    if (!apiKey) {
      console.warn("Google Maps API key not found. Location autocomplete disabled.");
      return;
    }

    // Capture the ref value at the start of the effect
    const container = containerRef.current;
    if (!container) return;

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
        
        if (!container) return;

        // Create the new PlaceAutocompleteElement
        const autocompleteElement = document.createElement("gmp-place-autocomplete");
        
        // Set attributes
        autocompleteElement.setAttribute("component-restrictions", JSON.stringify({ country: "gb" }));
        autocompleteElement.setAttribute("types", "geocode|establishment");
        autocompleteElement.setAttribute("placeholder", placeholder);
        
        // Apply custom styling to match our design
        autocompleteElement.style.width = "100%";
        
        // Clear container and append the element
        container.innerHTML = "";
        container.appendChild(autocompleteElement);

        // Listen for place selection using the custom event
        autocompleteElement.addEventListener("gmp-placeselect", async (event: Event) => {
          // The event target contains the place object
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          const place = (event.target as any).place;

          if (!place) {
            toast.error("Unable to get location details");
            return;
          }

          try {
            // Fetch place details with required fields
            await place.fetchFields({
              fields: [
                "formattedAddress",
                "location",
                "addressComponents",
                "displayName",
              ],
            });

            if (!place.location) {
              toast.error("Unable to get location details");
              return;
            }

            const locationData = extractLocationDataFromPlace(place);
            onChange(locationData);
          } catch (error) {
            console.error("Error fetching place details:", error);
            toast.error("Failed to get location details");
          }
        });

        setIsLoading(false);
      } catch (error) {
        console.error("Error loading Google Maps:", error);
        toast.error("Failed to load location services");
        setIsLoading(false);
      }
    })();

    return () => {
      // Cleanup - use the captured container reference
      if (container) {
        container.innerHTML = "";
      }
    };
  }, [onChange, placeholder]);

  // Update value when changed externally
  useEffect(() => {
    const container = containerRef.current;
    if (container && value) {
      // Set the value on the autocomplete element's input
      const input = container.querySelector("input");
      if (input) {
        input.value = value.displayText;
      }
    } else if (container && !value) {
      const input = container.querySelector("input");
      if (input) {
        input.value = "";
      }
    }
  }, [value]);

  // Extract structured data from Google Place (new API)
  const extractLocationDataFromPlace = (
    place: google.maps.places.Place
  ): LocationData => {
    const lat = place.location!.lat();
    const lng = place.location!.lng();
    const formattedAddress = place.formattedAddress || "";

    // Extract city and postcode from address components
    let city: string | undefined;
    let postcode: string | undefined;

    if (place.addressComponents) {
      for (const component of place.addressComponents) {
        const longText = component.longText || undefined;
        if (component.types.includes("postal_town")) {
          city = longText;
        } else if (component.types.includes("locality") && !city) {
          city = longText;
        } else if (component.types.includes("postal_code")) {
          postcode = longText;
        }
      }
    }

    // Create a shorter display text
    const displayText = postcode || city || place.displayName || formattedAddress.split(",")[0];

    return {
      displayText,
      formattedAddress,
      latitude: lat,
      longitude: lng,
      city,
      postcode,
    };
  };

  // Extract structured data from GeocoderResult (legacy API for reverse geocoding)
  const extractLocationDataFromGeocode = (
    result: google.maps.GeocoderResult
  ): LocationData => {
    const lat = result.geometry.location.lat();
    const lng = result.geometry.location.lng();
    const formattedAddress = result.formatted_address || "";

    // Extract city and postcode from address components
    let city: string | undefined;
    let postcode: string | undefined;

    if (result.address_components) {
      for (const component of result.address_components) {
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
    const displayText = postcode || city || formattedAddress.split(",")[0];

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
                const locationData = extractLocationDataFromGeocode(results[0]);
                
                // Update the input value
                if (containerRef.current) {
                  const input = containerRef.current.querySelector("input");
                  if (input) {
                    input.value = locationData.displayText;
                  }
                }
                
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

  return (
    <div className={`flex gap-2 ${className}`}>
      <div 
        ref={containerRef} 
        className="relative flex-1"
        style={{ opacity: isLoading ? 0.5 : 1 }}
      >
        {isLoading && (
          <div className="absolute inset-0 flex items-center justify-center bg-background/50">
            <span className="text-sm text-muted-foreground">Loading...</span>
          </div>
        )}
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
