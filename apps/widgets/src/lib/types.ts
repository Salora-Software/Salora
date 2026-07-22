import type { ORPCRouterOutput } from '@salora/shared-types';

// 1. Haal het ruwe type op uit de router output
type RawOccupancy = ORPCRouterOutput['v1']['appointment']['getOccupancy'];
type RawAvailability = ORPCRouterOutput['v1']['appointment']['getAvailability'];
type RawCreateBooking = ORPCRouterOutput['v1']['appointment']['createBooking'];

// 2. Dwing het naar een plat object door een interface te extenden.
// Svelte ziet dit nu als een keihard, statisch object.
export interface OccupancyOutput extends RawOccupancy { }
export interface AvailabilityOutput extends RawAvailability { }
export interface CreateBookingOutput extends RawCreateBooking { }