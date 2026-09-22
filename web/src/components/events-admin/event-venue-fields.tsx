"use client";

import { useState } from "react";
import type { EventRecord } from "@/lib/events-contract";
import { centerEventLocation } from "@/lib/event-location";
import { SlideRegion } from "@/components/ui/slide-region";
import { MenuSelect } from "@/components/ui/menu-select";
import { FormControl } from "@/components/ui/primitives";
import "@/styles/slide-region.css";

export function EventVenueFields({ event }: { readonly event: EventRecord | null }) {
  const [external, setExternal] = useState(event?.venueType === "external");
  const [location, setLocation] = useState(event?.venueType === "external" ? event.location : "");
  const [locationEn, setLocationEn] = useState(event?.venueType === "external" ? event.locationEn : "");
  return (
    <>
      <label>행사 장소
        <FormControl>
          <MenuSelect aria-label="행사 장소" name="venueType" value={external ? "external" : "center"} onChange={(change) => setExternal(change.target.value === "external")}>
            <option value="center">센터</option>
            <option value="external">외부 장소</option>
          </MenuSelect>
        </FormControl>
      </label>
      <div className="event-venue-details">
      <SlideRegion open={!external}><p className="muted">{centerEventLocation.location}<br />센터 주소가 자동으로 적용됩니다.</p></SlideRegion>
      <SlideRegion open={external}><div className="events-field-grid">
        <label>장소 · 한국어
          <FormControl><input name="location" disabled={!external} value={location} onChange={(change) => setLocation(change.target.value)} required maxLength={300} /></FormControl>
        </label>
        <label>장소 · 영어 (선택)
          <FormControl><input aria-label="장소 · 영어 (선택)" aria-describedby="event-venue-english-help" name="locationEn" disabled={!external} value={locationEn} onChange={(change) => setLocationEn(change.target.value)} maxLength={300} /></FormControl>
          <span id="event-venue-english-help" className="muted">입력하지 않으면 영어 페이지에도 한국어 장소가 표시됩니다.</span>
        </label>
      </div></SlideRegion>
      </div>
    </>
  );
}
