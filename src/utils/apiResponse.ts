export const ok = (res: any, data = {}) =>
  res.status(200).json({ success: true, ...data });
export const created = (res: any, data = {}) =>
  res.status(201).json({ success: true, ...data });
export const badRequest = (res: any, msg = "Bad request") =>
  res.status(400).json({ success: false, error: msg });
export const unauthorized = (res: any) =>
  res.status(401).json({ success: false, error: "Unauthorized" });
export const forbidden = (res: any) =>
  res.status(403).json({ success: false, error: "Forbidden" });
export const notFound = (res: any, msg = "Not found") =>
  res.status(404).json({ success: false, error: msg });
export const methodNotAllowed = (res: any, msg = "Method not allowed") =>
  res.status(405).json({ success: false, error: msg });
export const conflict = (res: any, msg = "Conflict") =>
  res.status(409).json({ success: false, error: msg });
export const serverError = (res: any, err = "Internal server error") =>
  res.status(500).json({ success: false, error: err });
