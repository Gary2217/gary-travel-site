"use client";

import type { TripBanner } from "@/lib/supabase";
import { DEFAULT_PRICE_DETAIL, EMPTY_TRIP_BANNER, type PriceDetailContent } from "./tripShared";

export interface TripFormState {
  title: string;
  subtitle: string;
  priceRange: string;
  highlights: string;
  destinationId: string;
}

export interface BannerFormState {
  tripBanner: TripBanner;
  dayCount: string;
  nightCount: string;
  bannerTagInput: string;
}

export interface DepartureFormState {
  date: string;
  price: string;
  groupCode: string;
  waitlist: string;
  label: string;
}

export interface PromoFormState {
  content: string;
  enabled: boolean;
}

export interface GateState {
  showDownloadGate: boolean;
  downloadReady: boolean;
  showShareGate: boolean;
}

export interface PanelState {
  showEditPanel: boolean;
  showPriceDetailModal: boolean;
  showPriceInfoModal: boolean;
  showBannerEditor: boolean;
  isCreatingNewDeparture: boolean;
  showMobileDatePicker: boolean;
  showPromoEditor: boolean;
  showPromoPopup: boolean;
  showAllDates: boolean;
  showNewDestInput: boolean;
}

export interface TripPageEditorState {
  gates: GateState;
  panels: PanelState;
  tripForm: TripFormState;
  bannerForm: BannerFormState;
  departureForm: DepartureFormState;
  detailForm: PriceDetailContent;
  promoForm: PromoFormState;
  tableActiveMonth: string;
  newDestName: string;
}

type TripPageEditorAction =
  | { type: "set-gates"; payload: Partial<GateState> }
  | { type: "set-panels"; payload: Partial<PanelState> }
  | { type: "set-trip-form"; payload: Partial<TripFormState> }
  | { type: "set-banner-form"; payload: Partial<BannerFormState> }
  | { type: "set-trip-banner"; payload: TripBanner }
  | { type: "set-departure-form"; payload: Partial<DepartureFormState> }
  | { type: "set-detail-form"; payload: Partial<PriceDetailContent> }
  | { type: "replace-detail-form"; payload: PriceDetailContent }
  | { type: "set-promo-form"; payload: Partial<PromoFormState> }
  | { type: "set-table-active-month"; payload: string }
  | { type: "set-new-dest-name"; payload: string };

export const createInitialTripPageEditorState = (): TripPageEditorState => ({
  gates: {
    showDownloadGate: false,
    downloadReady: false,
    showShareGate: false,
  },
  panels: {
    showEditPanel: false,
    showPriceDetailModal: false,
    showPriceInfoModal: false,
    showBannerEditor: false,
    isCreatingNewDeparture: false,
    showMobileDatePicker: false,
    showPromoEditor: false,
    showPromoPopup: false,
    showAllDates: false,
    showNewDestInput: false,
  },
  tripForm: {
    title: "",
    subtitle: "",
    priceRange: "",
    highlights: "",
    destinationId: "",
  },
  bannerForm: {
    tripBanner: EMPTY_TRIP_BANNER,
    dayCount: "",
    nightCount: "",
    bannerTagInput: "",
  },
  departureForm: {
    date: "",
    price: "",
    groupCode: "",
    waitlist: "",
    label: "",
  },
  detailForm: DEFAULT_PRICE_DETAIL,
  promoForm: {
    content: "",
    enabled: false,
  },
  tableActiveMonth: "all",
  newDestName: "",
});

export function tripPageEditorReducer(state: TripPageEditorState, action: TripPageEditorAction): TripPageEditorState {
  switch (action.type) {
    case "set-gates":
      return { ...state, gates: { ...state.gates, ...action.payload } };
    case "set-panels":
      return { ...state, panels: { ...state.panels, ...action.payload } };
    case "set-trip-form":
      return { ...state, tripForm: { ...state.tripForm, ...action.payload } };
    case "set-banner-form":
      return { ...state, bannerForm: { ...state.bannerForm, ...action.payload } };
    case "set-trip-banner":
      return { ...state, bannerForm: { ...state.bannerForm, tripBanner: action.payload } };
    case "set-departure-form":
      return { ...state, departureForm: { ...state.departureForm, ...action.payload } };
    case "set-detail-form":
      return { ...state, detailForm: { ...state.detailForm, ...action.payload } };
    case "replace-detail-form":
      return { ...state, detailForm: action.payload };
    case "set-promo-form":
      return { ...state, promoForm: { ...state.promoForm, ...action.payload } };
    case "set-table-active-month":
      return { ...state, tableActiveMonth: action.payload };
    case "set-new-dest-name":
      return { ...state, newDestName: action.payload };
    default:
      return state;
  }
}
