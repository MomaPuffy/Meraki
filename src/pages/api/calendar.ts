import { NextApiRequest, NextApiResponse } from "next";
import { getServerSession } from "next-auth";
import { authOptions } from "./auth/[...nextauth]";
import clientPromise from "@/lib/mongodb";
import { ObjectId } from "mongodb";
import {
  ok,
  created,
  unauthorized,
  badRequest,
  methodNotAllowed,
  serverError,
} from "@/utils/apiResponse";

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  const session = await getServerSession(req, res, authOptions);

  // Allow public read access for GET requests (for prerendering)
  if (req.method === "GET") {
    try {
      const client = await clientPromise;
      const db = client.db("meraki");

      const calendarEvents = await db.collection("calendar").find().toArray();

      // Ensure dates are properly formatted
      const formattedEvents = calendarEvents.map((event) => ({
        ...event,
        date: new Date(event.date).toISOString(),
      }));

      return ok(res, { events: formattedEvents });
    } catch (error) {
      console.error("Error fetching calendar events:", error);
      return serverError(res, "Internal Server Error");
    }
  }

  // Require authentication for all other methods
  if (!session) {
    return unauthorized(res);
  }

  if (req.method === "POST") {
    try {
      const client = await clientPromise;
      const db = client.db("meraki");

      const event = {
        ...req.body,
        date: new Date(req.body.datetime || req.body.date),
      };
      // Remove datetime field if it exists since we store as date
      delete event.datetime;

      const result = await db.collection("calendar").insertOne(event);

      return created(res, { ...event, _id: result.insertedId });
    } catch (error) {
      console.error("Error creating calendar event:", error);
      return serverError(res, "Internal Server Error");
    }
  }

  if (req.method === "PUT") {
    try {
      const client = await clientPromise;
      const db = client.db("meraki");
      const { _id, datetime, ...updateData } = req.body;

      const updatePayload = {
        ...updateData,
        date: new Date(datetime || updateData.date),
      };

      await db
        .collection("calendar")
        .updateOne({ _id: new ObjectId(_id) }, { $set: updatePayload });

      return ok(res, { message: "Event updated successfully" });
    } catch (error) {
      console.error("Error updating calendar event:", error);
      return serverError(res, "Internal Server Error");
    }
  }

  if (req.method === "DELETE") {
    try {
      const client = await clientPromise;
      const db = client.db("meraki");
      const { id } = req.query;

      if (!ObjectId.isValid(id as string)) {
        return badRequest(res, "Invalid ID format");
      }

      await db
        .collection("calendar")
        .deleteOne({ _id: new ObjectId(id as string) });

      return ok(res, { message: "Event deleted successfully" });
    } catch (error) {
      console.error("Error deleting calendar event:", error);
      return serverError(res, "Internal Server Error");
    }
  }

  return methodNotAllowed(res);
}
