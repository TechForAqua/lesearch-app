import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { options } from "@/app/api/auth/[...nextauth]/options";

const PYTHON_BACKEND_URL =
	process.env.PYTHON_BACKEND_URL || "http://localhost:8000";

export async function GET(
	request: NextRequest,
	{ params }: { params: { jobId: string } }
) {
	try {
		// Get user session
		const session = await getServerSession(options);

		if (!session?.user) {
			return NextResponse.json(
				{ error: "Unauthorized", message: "You must be logged in to download results" },
				{ status: 401 }
			);
		}

		const { jobId } = params;

		// Validate jobId format (UUID)
		const uuidRegex =
			/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
		if (!uuidRegex.test(jobId)) {
			return NextResponse.json(
				{ error: "Invalid Job ID", message: "Job ID must be a valid UUID" },
				{ status: 400 }
			);
		}

		// Forward request to Python backend
		const response = await fetch(`${PYTHON_BACKEND_URL}/jobs/${jobId}/download`, {
			method: "GET",
		});

		if (!response.ok) {
			if (response.status === 404) {
				return NextResponse.json(
					{ error: "Not Found", message: "Download not available for this job" },
					{ status: 404 }
				);
			}

			if (response.status === 400) {
				return NextResponse.json(
					{ error: "Bad Request", message: "Job is not completed yet" },
					{ status: 400 }
				);
			}

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
					message: error.detail || "Failed to download result",
				},
				{ status: response.status }
			);
		}

		// Stream the file from Python backend to client
		const blob = await response.blob();

		return new NextResponse(blob, {
			status: 200,
			headers: {
				"Content-Type": "application/zip",
				"Content-Disposition": `attachment; filename="reproduction_${jobId}.zip"`,
			},
		});
	} catch (error) {
		console.error("Error downloading result:", error);

		return NextResponse.json(
			{
				error: "Internal Server Error",
				message:
					error instanceof Error ? error.message : "Failed to download result",
			},
			{ status: 500 }
		);
	}
}
