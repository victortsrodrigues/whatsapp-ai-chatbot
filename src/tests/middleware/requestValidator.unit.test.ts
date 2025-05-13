import { Request, Response } from "express";
import {
  validateWebhookPayload,
  validateContentType,
} from "../../middleware/requestValidator";
import logger from "../../utils/logger";

describe("validateWebhookPayload", () => {
  it("should call next() when payload has valid object and entry array", () => {
    // Arrange
    const req = {
      body: {
        object: "whatsapp_business_account",
        entry: [{ id: "123", changes: [] }],
      },
    } as Request;

    const res = {} as Response;

    const next = jest.fn();

    // Act
    validateWebhookPayload(req, res, next);

    // Assert
    expect(next).toHaveBeenCalledTimes(1);
  });

  it("should return 400 with error message when request body is empty", () => {
    // Arrange
    const req = {
      body: null,
    } as Request;

    const res = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn(),
    } as unknown as Response;

    const next = jest.fn();

    // Mock logger
    jest.spyOn(logger, "warn").mockImplementation();

    // Act
    validateWebhookPayload(req, res, next);

    // Assert
    expect(next).not.toHaveBeenCalled();
    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith({
      error: {
        message: "Missing request body",
        status: 400,
      },
    });
    expect(logger.warn).toHaveBeenCalledWith(
      "Invalid webhook payload:",
      expect.any(Error)
    );
  });

  it("should return 400 with error message when object field is missing", () => {
    // Arrange
    const req = {
      body: {
        entry: [],
      },
    } as Request;

    const res = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn(),
    } as unknown as Response;

    const next = jest.fn();

    // Mock logger
    jest.spyOn(logger, "warn").mockImplementation();

    // Act
    validateWebhookPayload(req, res, next);

    // Assert
    expect(next).not.toHaveBeenCalled();
    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith({
      error: {
        message: "Missing object field in webhook payload",
        status: 400,
      },
    });
    expect(logger.warn).toHaveBeenCalledWith(
      "Invalid webhook payload:",
      expect.any(Error)
    );
  });
});

describe("validateContentType", () => {
  it("should allow GET requests to pass through regardless of content type", () => {
    // Arrange
    const req = {
      method: "GET",
      headers: {
        "content-type": "text/plain",
      },
    } as Request;

    const res = {} as Response;
    const next = jest.fn();

    // Act
    validateContentType(req, res, next);

    // Assert
    expect(next).toHaveBeenCalled();
  });

  it("should return 415 when non-GET request has no content-type header", () => {
    // Arrange
    const req = {
      method: "POST",
      headers: {},
    } as Request;

    const res = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn(),
    } as unknown as Response;

    const next = jest.fn();

    jest.spyOn(logger, "warn").mockImplementation();

    // Act
    validateContentType(req, res, next);

    // Assert
    expect(logger.warn).toHaveBeenCalledWith("Invalid content type: undefined");
    expect(res.status).toHaveBeenCalledWith(415);
    expect(res.json).toHaveBeenCalledWith({
      error: {
        message: "Content-Type must be application/json",
        status: 415,
      },
    });
    expect(next).not.toHaveBeenCalled();
  });

  it("should return 415 when non-GET request has empty content-type", () => {
    // Arrange
    const req = {
      method: "POST",
      headers: {
        "content-type": "",
      },
    } as Request;

    const res = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn(),
    } as unknown as Response;

    const next = jest.fn();

    jest.spyOn(logger, "warn").mockImplementation();

    // Act
    validateContentType(req, res, next);

    // Assert
    expect(logger.warn).toHaveBeenCalledWith("Invalid content type: ");
    expect(res.status).toHaveBeenCalledWith(415);
    expect(res.json).toHaveBeenCalledWith({
      error: {
        message: "Content-Type must be application/json",
        status: 415,
      },
    });
    expect(next).not.toHaveBeenCalled();
  });
});
