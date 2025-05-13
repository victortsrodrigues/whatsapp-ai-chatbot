import { Request, Response, NextFunction } from "express";
import { ApiError } from "../../../interfaces/index";
import { errorHandler, notFoundHandler } from "../../../middleware/errorHandler";
import logger from "../../../utils/logger";

describe("errorHandler", () => {
  // Handles ApiError with statusCode, message, and details correctly
  it("should set correct status, message and details when handling ApiError", () => {
    // Arrange
    const err = {
      statusCode: 404,
      message: "Resource not found",
      details: { id: "123" },
    } as ApiError;

    const req = { path: "/api/resource" } as Request;
    const res = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn(),
    } as unknown as Response;
    const next = jest.fn() as NextFunction;

    jest.spyOn(logger, "warn").mockImplementation();

    // Act
    errorHandler(err, req, res, next);

    // Assert
    expect(res.status).toHaveBeenCalledWith(404);
    expect(res.json).toHaveBeenCalledWith({
      error: {
        message: "Resource not found",
        details: { id: "123" },
        status: 404,
      },
    });
    expect(logger.warn).toHaveBeenCalledWith(
      "Client error: Resource not found",
      {
        statusCode: 404,
        path: "/api/resource",
      }
    );
  });

  it("should handle syntax error as 400 bad request", () => {
    // Arrange
    const err = new SyntaxError("Invalid JSON");
    const req = { path: "/api/resource" } as Request;
    const res = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn(),
    } as unknown as Response;
    const next = jest.fn() as NextFunction;
    jest.spyOn(logger, "warn").mockImplementation();
    // Act
    errorHandler(err, req, res, next);
    // Assert
    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith({
      error: {
        message: "Invalid JSON payload",
        status: 400,
      },
    });
  });

  it("should handle validation error as 400 bad request", () => {
    // Arrange
    const err = new Error("Validation error") as unknown as ApiError;
    err.name = "ValidationError";
    const req = { path: "/api/resource" } as Request;
    const res = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn(),
    } as unknown as Response;
    const next = jest.fn() as NextFunction;
    jest.spyOn(logger, "warn").mockImplementation();
    // Act
    errorHandler(err, req, res, next);
    // Assert
    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith({
      error: {
        message: "Validation error",
        status: 400,
      },
    });
  });

  it("should handle other errors as 500 internal server error", () => {
    // Arrange
    const err = new Error("Internal server error");
    const req = { path: "/api/resource" } as Request;
    const res = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn(),
    } as unknown as Response;
    const next = jest.fn() as NextFunction;
    jest.spyOn(logger, "warn").mockImplementation();
    jest.spyOn(logger, "error").mockImplementation();
    // Act
    errorHandler(err, req, res, next);
    // Assert
    expect(res.status).toHaveBeenCalledWith(500);
    expect(res.json).toHaveBeenCalledWith({
      error: {
        message: "Internal Server Error",
        status: 500,
      },
    });
  });

  it("should handle notFoundHandler as 404 not found", () => {
    // Arrange
    const req = { path: "/api/resource", method: "GET" } as Request;
    const res = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn(),
    } as unknown as Response;
    const next = jest.fn() as NextFunction;
    jest.spyOn(logger, "warn").mockImplementation();
    // Act
    notFoundHandler(req, res, next);
    // Assert
    expect(res.status).toHaveBeenCalledWith(404);
    expect(res.json).toHaveBeenCalledWith({
      error: {
        message: "Not found: GET /api/resource",
        status: 404,
      },
    });
  });
});