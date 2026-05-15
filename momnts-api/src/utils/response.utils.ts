import { Response } from "express";

export const sendSuccess = (res: Response, data: any, message = "success") => {
  return res.status(200).json({
    ok: true,
    message,
    data,
  });
};

export const sendError = (res: Response, data: any, message = "error") => {
  return res.status(500).json({
    ok: false,
    message,
    data,
  });
};

export const sendNotFound = (
  res: Response,
  data: any,
  message = "not found",
) => {
  return res.status(404).json({
    ok: false,
    message,
    data,
  });
};

export const sendUnauthorized = (
  res: Response,
  data: any,
  message = "unauthorized",
) => {
  return res.status(401).json({
    ok: false,
    message,
    data,
  });
};

export const sendValidationErrors = (
  res: Response,
  errors: Record<string, string[]>,
) => {
  return res.status(422).json({
    ok: false,
    message: "Validation error",
    errors,
  });
};

export const sendForbidden = (
  res: Response,
  data: any,
  message = "forbidden",
) => {
  return res.status(403).json({
    ok: false,
    message,
    data,
  });
};

export const sendBadRequest = (
  res: Response,
  data: any,
  message = "bad request",
) => {
  return res.status(400).json({
    ok: false,
    message,
    data,
  });
};
