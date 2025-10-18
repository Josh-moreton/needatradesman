"use client";

import { useEffect, useRef, useState } from "react";
import { importLibrary, setOptions } from "@googlemaps/js-api-loader";
import { Button } from "@/components/ui/button";
import { Navigation } from "lucide-react";
import { toast } from "sonner";

export interface LocationData {
  id: string; // Place ID - the only proof of valid selection
  displayText: string;
  formattedAddress: string;
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

interface GmpPlaceAutocompleteElement extends HTMLElement {
  value?: string;
}

declare global {
  var __googleMapsConfigured__: boolean | undefined;
}

export function LocationInput({
  value,
  onChange,
  placeholder = "Enter location or use current location",
  disabled = false,
  className = "",
}: Readonly<LocationInputProps>) {
  const GmpAutocomplete = "gmp-place-autocomplete" as unknown as React.ElementType;
  const containerRef = useRef<HTMLDivElement>(null);
  const autocompleteElementRef = useRef<GmpPlaceAutocompleteElement | null>(null);
  const onChangeRef = useRef(onChange);
  const [isLoading, setIsLoading] = useState(false);
  const [isGettingLocation, setIsGettingLocation] = useState(false);

  useEffect(() => {
    onChangeRef.current = onChange;
  }, [onChange]);

  useEffect(() => {
    const apiKey = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY;
    if (!apiKey) {
      console.warn("Google Maps API key not found. Location autocomplete disabled.");
      return;
    }

    setIsLoading(true);
    if (!globalThis.__googleMapsConfigured__) {
      setOptions({ key: apiKey, v: "weekly", libraries: ["places"] });
      globalThis.__googleMapsConfigured__ = true;
    }

    let cleanup: (() => void) | undefined;
    let isMounted = true;

    (async () => {
      try {
        await importLibrary("places");
        try {
          await importLibrary("geocoding");
        } catch {
          /* optional */
        }

        if (!isMounted) return;
        const el = autocompleteElementRef.current;
        const attach = (element: GmpPlaceAutocompleteElement) => {
          const handler = async (event: Event) => {
            // Try all known shapes for the gmp-placeselect event
            const anyEvent = event as unknown as {
              place?: google.maps.places.Place
              detail?: { place?: google.maps.places.Place }
              target?: { place?: google.maps.places.Place }
            }
            const place = anyEvent.place || anyEvent.detail?.place || anyEvent.target?.place;
            if (!place) {
              toast.error("Unable to get location details");
              return;
            }
            try {
              // Fetch minimal fields - Place ID is the key validation field
              await place.fetchFields({
                fields: [
                  "id", // The Place ID - proof of valid selection
                  "formattedAddress",
                  "location",
                  "addressComponents",
                  "displayName",
                ],
              });
              if (!place.location || !place.id) {
                toast.error("Unable to get location details");
                return;
              }
              const locationData = extractLocationDataFromPlace(place);
              onChangeRef.current(locationData);
            } catch (error) {
              console.error("Error fetching place details:", error);
              toast.error("Failed to get location details");
            }
          };
          element.addEventListener("gmp-placeselect", handler as EventListener);
          
          // Clear the selection if user types after selecting - text alone is meaningless
          const inputHandler = () => {
            onChangeRef.current(null);
          };
          element.addEventListener("input", inputHandler as EventListener);
          
          cleanup = () => {
            element.removeEventListener("gmp-placeselect", handler as EventListener);
            element.removeEventListener("input", inputHandler as EventListener);
          };
        };

        if (!el) {
          queueMicrotask(() => {
            const lateEl = autocompleteElementRef.current;
            if (!lateEl) return;
            attach(lateEl);
            setIsLoading(false);
          });
          return;
        }

        attach(el);
        setIsLoading(false);
      } catch (error) {
        console.error("Error loading Google Maps:", error);
        if (isMounted) {
          toast.error("Failed to load location services");
          setIsLoading(false);
        }
      }
    })();

    return () => {
      isMounted = false;
      cleanup?.();
    };
  }, []);

  useEffect(() => {
    const el = autocompleteElementRef.current;
    if (!el) return;
    const text = value?.displayText ?? "";
    try {
      if (typeof el.value !== "undefined") {
        el.value = text;
      } else if (text) {
        el.setAttribute("value", text);
      } else {
        el.removeAttribute("value");
      }
    } catch {
      // ignore best-effort value update
    }
  }, [value]);

  const extractLocationDataFromPlace = (
    place: google.maps.places.Place
  ): LocationData => {
    const lat = place.location!.lat();
    const lng = place.location!.lng();
    const formattedAddress = place.formattedAddress || "";
    const placeId = place.id || ""; // Place ID - the key validation field

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

    const displayText = postcode || city || place.displayName || formattedAddress.split(",")[0];

    return {
      id: placeId,
      displayText,
      formattedAddress,
      latitude: lat,
      longitude: lng,
      city,
      postcode,
    };
  };

  const extractLocationDataFromGeocode = (
    result: google.maps.GeocoderResult
  ): LocationData => {
    const lat = result.geometry.location.lat();
    const lng = result.geometry.location.lng();
    const formattedAddress = result.formatted_address || "";
    const placeId = result.place_id || ""; // Place ID from geocode result

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

    const displayText = postcode || city || formattedAddress.split(",")[0];

    return {
      id: placeId,
      displayText,
      formattedAddress,
      latitude: lat,
      longitude: lng,
      city,
      postcode,
    };
  };

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
          const apiKey = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY;
          if (!apiKey) {
            toast.error("Location services not configured");
            setIsGettingLocation(false);
            return;
          }

          if (!globalThis.google?.maps) {
            toast.error("Location services not ready");
            setIsGettingLocation(false);
            return;
          }

          try {
            await importLibrary("geocoding");
          } catch {
            /* ignore */
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
                if (containerRef.current) {
                  const input = containerRef.current.querySelector("input") as HTMLInputElement | null;
                  if (input) input.value = locationData.displayText;
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
      <div ref={containerRef} className="relative flex-1" style={{ opacity: isLoading ? 0.5 : 1 }}>
        {isLoading && (
          <div className="absolute inset-0 flex items-center justify-center bg-background/50 pointer-events-none">
            <span className="text-sm text-muted-foreground">Loading...</span>
          </div>
        )}
        <GmpAutocomplete
          ref={(el: Element | null) => {
            autocompleteElementRef.current = el as GmpPlaceAutocompleteElement | null;
          }}
          component-restrictions={JSON.stringify({ country: "gb" })}
          placeholder={placeholder}
          className="file:text-foreground placeholder:text-muted-foreground selection:bg-primary selection:text-primary-foreground dark:bg-input/30 border-input flex h-9 w-full min-w-0 rounded-md border bg-transparent px-3 py-1 text-base shadow-xs transition-[color,box-shadow] outline-none file:inline-flex file:h-7 file:border-0 file:bg-transparent file:text-sm file:font-medium disabled:pointer-events-none disabled:cursor-not-allowed disabled:opacity-50 md:text-sm focus-visible:border-ring focus-visible:ring-ring/50 focus-visible:ring-[3px] aria-invalid:ring-destructive/20 dark:aria-invalid:ring-destructive/40 aria-invalid:border-destructive"
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
