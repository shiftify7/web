export type StateLandingCopy = {
  intro: string;
  planning: string;
  localNote: string;
};

/** Editorial copy keyed by the canonical region slug; no second region list lives here. */
export const STATE_LANDING_COPY: Record<string, StateLandingCopy> = {
  'andhra-pradesh': {
    intro: 'Planning a move involving Andhra Pradesh? Start with the route, inventory and date, then compare a written quote rather than a generic online estimate.',
    planning: 'Amaravati is the capital named for Andhra Pradesh. A move to or from the state may involve a mix of city roads, apartment access and longer intercity legs, so the survey should record both ends clearly.',
    localNote: 'Share the exact pickup and drop city, floor and lift details before a quote is prepared.',
  },
  'arunachal-pradesh': {
    intro: 'For Arunachal Pradesh, start with the route and access details before arranging a household or office move.',
    planning: 'Itanagar is the capital of Arunachal Pradesh. Terrain, road conditions and the final access point are useful details to include when a move reaches the state.',
    localNote: 'Keep the final approach, parking and packing requirements in the survey brief.',
  },
  assam: {
    intro: 'Planning a move involving Assam? Share the pickup and drop city, the inventory and the date so the quote can be built around the actual route.',
    planning: 'Dispur is the capital of Assam. Moves involving the state can include city-apartment access as well as longer road legs, making a written scope especially useful.',
    localNote: 'Mention lift access, stairs, fragile items and vehicle requirements early.',
  },
  bihar: {
    intro: 'For a move involving Bihar, a clear inventory and both city names make the first conversation more useful than a broad price promise.',
    planning: 'Patna is the capital of Bihar. The moving plan should separate packing, loading, transport and unloading so the written quote is easy to compare.',
    localNote: 'Confirm building access and the preferred moving date before finalising the plan.',
  },
  chhattisgarh: {
    intro: 'Planning a relocation involving Chhattisgarh? Start with a route-led enquiry and a practical inventory of what needs to move.',
    planning: 'Raipur is the capital of Chhattisgarh. A survey helps capture access, packing volume and the final delivery address before a quote is written.',
    localNote: 'A video or doorstep survey can clarify the move without relying on a generic rate card.',
  },
  goa: {
    intro: 'Moving to, from or within Goa starts with the exact city, building access and the date — not a one-size-fits-all estimate.',
    planning: 'Panaji is the capital of Goa. Include parking, stairs, lift access and any vehicle movement in the initial route details.',
    localNote: 'A written itemised scope makes packing and transport lines clear before booking.',
  },
  gujarat: {
    intro: 'For a Gujarat relocation, share both ends of the route and the inventory so the survey can account for access and transport together.',
    planning: 'Gandhinagar is the capital of Gujarat. The capital image on this page is a local reference; it is not a claim of a branch or office.',
    localNote: 'Confirm the origin and destination building rules before move day.',
  },
  haryana: {
    intro: 'Planning a move in Haryana or around the NCR border? Share the city, locality and date for a route-specific written quote.',
    planning: 'Chandigarh is the capital of Haryana. Gurgaon is an existing Shiftify city page; the city page covers local context while this page keeps the state-level route and service overview together.',
    localNote: 'For NCR moves, mention society entry rules, lift timings and parking restrictions.',
  },
  'himachal-pradesh': {
    intro: 'Moves involving Himachal Pradesh benefit from a clear access brief: route, building approach, inventory and preferred date.',
    planning: 'Shimla is the capital of Himachal Pradesh. A survey should record the final approach and any carrying distance alongside the household inventory.',
    localNote: 'Do not rely on a generic distance estimate when the final approach is complex.',
  },
  jharkhand: {
    intro: 'For a Jharkhand move, start with the exact pickup and drop city, inventory and access details so the quote matches the job.',
    planning: 'Ranchi is the capital of Jharkhand. A written moving scope can separate packing, loading, transport and delivery requirements.',
    localNote: 'Share fragile-item, vehicle and floor information before a survey.',
  },
  karnataka: {
    intro: 'Planning a move involving Karnataka? Begin with the route, apartment access and inventory so the quote reflects the actual move.',
    planning: 'Bengaluru is the capital of Karnataka and an existing Shiftify city page. For a wider state route, use this page for the overview and the city page for Bengaluru-specific links.',
    localNote: 'Society booking windows and lift access are useful details for an apartment move.',
  },
  kerala: {
    intro: 'A Kerala relocation is easier to scope when the enquiry includes both city names, the inventory and the date.',
    planning: 'Thiruvananthapuram is the capital of Kerala. Include access, packing and delivery-floor details when requesting a written quote.',
    localNote: 'List fragile items and any vehicle movement separately from household cartons.',
  },
  'madhya-pradesh': {
    intro: 'Planning a move involving Madhya Pradesh? Share the exact route and inventory before comparing a written quote.',
    planning: 'Bhopal is the capital of Madhya Pradesh. A survey gives the moving plan enough detail to account for packing, loading and final delivery access.',
    localNote: 'A clear inventory is the best starting point for a useful survey.',
  },
  maharashtra: {
    intro: 'For Maharashtra moves, route, building access and inventory details matter more than a generic city-to-city number.',
    planning: 'Mumbai is the capital of Maharashtra and an existing Shiftify city page. Use the Mumbai page for city-specific links and this page for the wider state overview.',
    localNote: 'Confirm society permissions, lift windows and parking before the move date.',
  },
  manipur: {
    intro: 'Planning a move involving Manipur? Start with a complete route and access brief before requesting a written quote.',
    planning: 'Imphal is the capital of Manipur. Include the final approach, packing volume and delivery access in the survey conversation.',
    localNote: 'The actual route and inventory should be confirmed before transport is planned.',
  },
  meghalaya: {
    intro: 'For a Meghalaya relocation, share both ends of the route, the inventory and any access constraints from the start.',
    planning: 'Shillong is the capital of Meghalaya. A practical survey records the final approach as well as the household or office items being moved.',
    localNote: 'Add carrying distance and stair details if a vehicle cannot reach the entrance.',
  },
  mizoram: {
    intro: 'Planning a move involving Mizoram? Use a route-led enquiry with accurate access details rather than a generic moving estimate.',
    planning: 'Aizawl is the capital of Mizoram. The survey should cover the final approach, packing scope and delivery access before the quote is written.',
    localNote: 'Mention the building approach and any bulky or fragile items early.',
  },
  nagaland: {
    intro: 'For a Nagaland move, an accurate route, inventory and access brief helps keep the written scope clear.',
    planning: 'Kohima is the capital of Nagaland. Include the final approach and carrying conditions alongside the usual packing and delivery details.',
    localNote: 'A video survey can help document access before a quote is prepared.',
  },
  odisha: {
    intro: 'Planning a relocation involving Odisha? Share the pickup and drop city, inventory and date before comparing quotes.',
    planning: 'Bhubaneswar is the capital of Odisha. A route-specific survey should cover packing, loading, transport and the final delivery access.',
    localNote: 'Keep building rules and parking instructions with the move brief.',
  },
  punjab: {
    intro: 'For Punjab moves, include the route, inventory and building access so the plan can be written around the actual requirements.',
    planning: 'Chandigarh is the capital of Punjab. The same capital city is also the capital of Haryana and a separate Union Territory, so the selected state or UT should remain explicit in the enquiry.',
    localNote: 'State and city identity stay in the quote data even when the capital is shared.',
  },
  rajasthan: {
    intro: 'Planning a move involving Rajasthan? Start with both city names, the inventory and the preferred date.',
    planning: 'Jaipur is the capital of Rajasthan. A written quote should make packing, transport and delivery assumptions visible before booking.',
    localNote: 'Mention vehicle transport and bulky items separately from household packing.',
  },
  sikkim: {
    intro: 'For a Sikkim relocation, the final approach and access details are important parts of the initial route brief.',
    planning: 'Gangtok is the capital of Sikkim. Share the route, inventory and carrying conditions so the survey can record the practical requirements.',
    localNote: 'A complete access note is more useful than a broad distance-only estimate.',
  },
  'tamil-nadu': {
    intro: 'Planning a move involving Tamil Nadu? Share the route, inventory and building details for a useful written scope.',
    planning: 'Chennai is the capital of Tamil Nadu. Include packing volume, lift access and the delivery floor when requesting a quote.',
    localNote: 'Keep the moving date and building permissions visible in the enquiry.',
  },
  telangana: {
    intro: 'For Telangana moves, an accurate pickup and drop city plus inventory gives the survey a clear starting point.',
    planning: 'Hyderabad is the capital of Telangana. A route-specific quote should separate packing, loading, transport and delivery requirements.',
    localNote: 'Mention apartment access and vehicle movement before the quote is prepared.',
  },
  tripura: {
    intro: 'Planning a move involving Tripura? Share the exact route, inventory and date before comparing a written quote.',
    planning: 'Agartala is the capital of Tripura. Include final approach and delivery access details alongside the packing scope.',
    localNote: 'The survey should cover both the origin and destination, not only the city names.',
  },
  'uttar-pradesh': {
    intro: 'For an Uttar Pradesh relocation, share the city, locality and date so the route can be scoped accurately.',
    planning: 'Lucknow is the capital of Uttar Pradesh. Noida is an existing Shiftify city page; use the city page for Noida links and this page for the state overview.',
    localNote: 'NCR society access and parking rules are useful to include for Noida-area moves.',
  },
  uttarakhand: {
    intro: 'Planning a move involving Uttarakhand? Start with the exact route, inventory and access conditions before requesting a written quote.',
    planning: 'Dehradun is the capital of Uttarakhand. A practical survey can record the final approach, carrying distance and delivery-floor details.',
    localNote: 'Share stairs, lifts and bulky-item details before packing is scheduled.',
  },
  'west-bengal': {
    intro: 'For a West Bengal move, route and building access details help turn a broad enquiry into a clear written scope.',
    planning: 'Kolkata is the capital of West Bengal. Include inventory, packing needs and the final delivery access in the survey brief.',
    localNote: 'Keep any society or building timing rules with the preferred moving date.',
  },
};
