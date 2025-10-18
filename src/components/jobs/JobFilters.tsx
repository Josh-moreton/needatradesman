"use client";

import { useRouter, useSearchParams, usePathname } from "next/navigation";
import { useState } from "react";
import { JobCategory } from "@/lib/schemas";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { LocationInput, type LocationData } from "@/components/ui/location-input";
import { Search, X } from "lucide-react";

const categoryOptions = [
  { value: JobCategory.PLUMBING, label: "Plumbing" },
  { value: JobCategory.ELECTRICAL, label: "Electrical" },
  { value: JobCategory.CARPENTRY, label: "Carpentry" },
  { value: JobCategory.BRICKLAYING, label: "Bricklaying" },
  { value: JobCategory.PLASTERING, label: "Plastering" },
  { value: JobCategory.PAINTING, label: "Painting" },
  { value: JobCategory.LANDSCAPING, label: "Landscaping" },
  { value: JobCategory.CLEANING, label: "Cleaning" },
  { value: JobCategory.HANDYMAN, label: "Handyman" },
  { value: JobCategory.OTHER, label: "Other" },
];

interface JobFiltersProps {
  userTrades?: JobCategory[];
}

export function JobFilters({ userTrades }: JobFiltersProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const pathname = usePathname();

  const [search, setSearch] = useState(searchParams.get("search") || "");
  const [location, setLocation] = useState<LocationData | null>(() => {
    const locationParam = searchParams.get("location");
    if (locationParam) {
      // Create a simple LocationData object from the URL param for display
      // Note: No Place ID from URL params - this is just for display/filtering
      return {
        id: "", // No Place ID available from URL params
        displayText: locationParam,
        formattedAddress: locationParam,
        latitude: Number(searchParams.get("lat")) || 0,
        longitude: Number(searchParams.get("lng")) || 0,
      };
    }
    return null;
  });
  const [category, setCategory] = useState(
    searchParams.get("category") || "all"
  );

  // Filter categories based on user's trades
  const availableCategories = userTrades
    ? categoryOptions.filter((option) => userTrades.includes(option.value))
    : categoryOptions;

  const handleSearch = () => {
    const params = new URLSearchParams();

    if (search.trim()) {
      params.set("search", search.trim());
    }

    if (location) {
      // Use displayText or postcode/city for filtering
      const locationText = location.postcode || location.city || location.displayText;
      params.set("location", locationText);
      
      // Include coordinates for distance-based searches if available
      if (location.latitude && location.longitude) {
        params.set("lat", String(location.latitude));
        params.set("lng", String(location.longitude));
      }
    }

    if (category && category !== "all") {
      params.set("category", category);
    }

    // Reset to page 1 when filtering
    params.set("page", "1");

    router.push(`${pathname}?${params.toString()}`);
  };

  const clearFilters = () => {
    setSearch("");
    setLocation(null);
    setCategory("all");
    router.push(pathname);
  };

  const hasActiveFilters =
    search || location || (category && category !== "all");

  return (
    <div className="bg-card border border-border rounded-lg p-6 shadow-sm">
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        {/* Search Input */}
        <div className="space-y-2">
          <label htmlFor="search-input" className="text-sm font-medium">
            Search
          </label>
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              id="search-input"
              placeholder="Search jobs..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-10"
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  handleSearch();
                }
              }}
            />
          </div>
        </div>

        {/* Location Input */}
        <div className="space-y-2">
          <label htmlFor="location-input" className="text-sm font-medium">
            Location
          </label>
          <LocationInput
            value={location}
            onChange={setLocation}
            placeholder="Enter location..."
          />
        </div>

        {/* Category Select */}
        <div className="space-y-2">
          <label htmlFor="category-select" className="text-sm font-medium">
            Category
          </label>
          <Select value={category} onValueChange={setCategory}>
            <SelectTrigger id="category-select">
              <SelectValue placeholder="All categories" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All categories</SelectItem>
              {availableCategories.map((option) => (
                <SelectItem key={option.value} value={option.value}>
                  {option.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Action Buttons */}
        <div className="space-y-2">
          <div className="text-sm font-medium invisible">Actions</div>
          <div className="flex gap-2">
            <Button onClick={handleSearch} className="flex-1">
              <Search className="h-4 w-4 mr-2" />
              Search
            </Button>
            {hasActiveFilters && (
              <Button variant="outline" onClick={clearFilters}>
                <X className="h-4 w-4" />
              </Button>
            )}
          </div>
        </div>
      </div>

      {/* Active Filters Display */}
      {hasActiveFilters && (
        <div className="mt-4 pt-4 border-t border-border">
          <div className="flex flex-wrap gap-2">
            <span className="text-sm text-muted-foreground">
              Active filters:
            </span>
            {search && (
              <span className="inline-flex items-center gap-1 px-2 py-1 bg-primary/10 text-primary text-sm rounded">
                Search: &ldquo;{search}&rdquo;
                <button
                  onClick={() => {
                    setSearch("");
                    handleSearch();
                  }}
                  className="ml-1 hover:text-primary/80"
                >
                  <X className="h-3 w-3" />
                </button>
              </span>
            )}
            {location && (
              <span className="inline-flex items-center gap-1 px-2 py-1 bg-primary/10 text-primary text-sm rounded">
                Location: {location.displayText}
                <button
                  onClick={() => {
                    setLocation(null);
                    handleSearch();
                  }}
                  className="ml-1 hover:text-primary/80"
                >
                  <X className="h-3 w-3" />
                </button>
              </span>
            )}
            {category && (
              <span className="inline-flex items-center gap-1 px-2 py-1 bg-primary/10 text-primary text-sm rounded">
                Category:{" "}
                {categoryOptions.find((opt) => opt.value === category)?.label}
                <button
                  onClick={() => {
                    setCategory("");
                    handleSearch();
                  }}
                  className="ml-1 hover:text-primary/80"
                >
                  <X className="h-3 w-3" />
                </button>
              </span>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
