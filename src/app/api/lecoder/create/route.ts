import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { options } from "@/app/api/auth/[...nextauth]/options";

const PYTHON_BACKEND_URL =
	process.env.PYTHON_BACKEND_URL || "http://localhost:8000";

export async function POST(request: NextRequest) {
	try {
		// Get user session
		const session = await getServerSession(options);

		if (!session?.user) {
			return NextResponse.json(
				{ error: "Unauthorized", message: "You must be logged in to create a reproduction job" },
				{ status: 401 }
			);
		}

		// Parse request body
		const body = await request.json();
		const { paper_url, repo_url, user_intent, model_preference } = body;

		// Validate required fields
		if (!repo_url || !user_intent) {
			return NextResponse.json(
				{
					error: "Validation Error",
					message: "repo_url and user_intent are required fields",
				},
				{ status: 400 }
			);
		}

		// Forward request to Python backend
		const response = await fetch(`${PYTHON_BACKEND_URL}/jobs`, {
			method: "POST",
			headers: {
				"Content-Type": "application/json",
			},
			body: JSON.stringify({
				paper_url,
				repo_url,
				user_intent,
				model_preference: model_preference || "claude",
			}),
		});

		if (!response.ok) {
			// Handle non-JSON error responses gracefully
			let error;
			try {
				error = await response.json();
			} catch {
				const textError = await response.text().catch(() => "Unknown error");
				error = { detail: textError || "Backend returned a non-JSON error response" };
			}

			return NextResponse.json(
				{
					error: "Backend Error",
					message: error.detail || "Failed to create reproduction job",
				},
				{ status: response.status }
			);
		}

		const data = await response.json();

		return NextResponse.json(data, { status: 201 });
	} catch (error) {
		console.error("Error creating reproduction job:", error);

		return NextResponse.json(
			{
				error: "Internal Server Error",
				message:
					error instanceof Error ? error.message : "Failed to create reproduction job",
			},
			{ status: 500 }
		);
	}
}
