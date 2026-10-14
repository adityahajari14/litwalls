import { DISPATCH_HOURS } from "@/lib/company";
import { deliveryEstimate } from "@/lib/marketing";
import {
  checkServiceability,
  isValidPincode,
  shiprocketConfigured,
} from "@/lib/shiprocket";

/**
 * "Can you deliver to 560001, and when?"
 *
 * Behind a route handler rather than a server action because the PDP is
 * statically generated — this has to be callable from a static page without
 * opting the whole route into dynamic rendering.
 *
 * Always answers with a usable date range. When Shiprocket has a real transit
 * time it is used; when it is unconfigured or unreachable the national
 * estimate the page already showed is returned instead, flagged as such. The
 * shopper never sees an error where a delivery date should be.
 */

export async function GET(request: Request) {
  const pincode = (
    new URL(request.url).searchParams.get("pincode") ?? ""
  ).trim();

  if (!isValidPincode(pincode)) {
    return Response.json(
      { ok: false, message: "Enter a valid 6-digit PIN code." },
      { status: 400 },
    );
  }

  const fallback = deliveryEstimate();

  if (!shiprocketConfigured()) {
    return Response.json({
      ok: true,
      serviceable: true,
      estimated: false,
      range: fallback.range,
      dispatchHours: DISPATCH_HOURS,
      courier: null,
      cod: null,
    });
  }

  const result = await checkServiceability(pincode);

  if (!result) {
    return Response.json({
      ok: true,
      serviceable: true,
      estimated: false,
      range: fallback.range,
      dispatchHours: DISPATCH_HOURS,
      courier: null,
      cod: null,
    });
  }

  if (!result.serviceable) {
    return Response.json({
      ok: true,
      serviceable: false,
      estimated: false,
      range: null,
      dispatchHours: DISPATCH_HOURS,
      courier: null,
      cod: null,
    });
  }

  // Shiprocket's day count is transit only; dispatch happens first, and the
  // shared estimator already knows about the same-day cutoff and weekends.
  const withTransit = result.days
    ? deliveryEstimate(new Date(), { min: result.days, max: result.days + 1 })
    : fallback;

  return Response.json({
    ok: true,
    serviceable: true,
    estimated: Boolean(result.days),
    range: withTransit.range,
    dispatchHours: DISPATCH_HOURS,
    courier: result.courier,
    cod: result.cod,
  });
}
