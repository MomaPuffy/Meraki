import { NextApiResponse } from "next";

export const ok = (res: NextApiResponse, data = {}) =>
  res.status(200).json({ success: true, ...data });
export const created = (res: NextApiResponse, data = {}) =>
  res.status(201).json({ success: true, ...data });
export const badRequest = (res: NextApiResponse, msg = "Bad request") =>
  res.status(400).json({ success: false, error: msg });
export const unauthorized = (res: NextApiResponse) =>
  res.status(401).json({ success: false, error: "Unauthorized" });
export const forbidden = (res: NextApiResponse) =>
  res.status(403).json({ success: false, error: "Forbidden" });
export const notFound = (res: NextApiResponse, msg = "Not found") =>
  res.status(404).json({ success: false, error: msg });
export const methodNotAllowed = (
  res: NextApiResponse,
  msg = "Method not allowed"
) => res.status(405).json({ success: false, error: msg });
export const conflict = (res: NextApiResponse, msg = "Conflict") =>
  res.status(409).json({ success: false, error: msg });
export const serverError = (
  res: NextApiResponse,
  err = "Internal server error"
) => res.status(500).json({ success: false, error: err });
