"use client";

import { useEffect, useState } from "react";
import {
	Loader2,
	CheckCircle2,
	XCircle,
	Download,
	RefreshCw,
	Clock,
	FileCode,
} from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
	Card,
	CardContent,
	CardDescription,
	CardHeader,
	CardTitle,
} from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";

interface JobResult {
	download_url: string;
	expires_at: string;
	files_generated: number;
	time_taken: number;
}

interface JobStatusData {
	job_id: string;
	status: string;
	progress: number;
	current_stage: string;
	result?: JobResult;
	error?: string;
	created_at: string;
	updated_at: string;
}

interface JobStatusProps {
	jobId: string;
	onNewJob: () => void;
}

export function JobStatus({ jobId, onNewJob }: JobStatusProps) {
	const [jobData, setJobData] = useState<JobStatusData | null>(null);
	const [isLoading, setIsLoading] = useState(true);
	const [isDownloading, setIsDownloading] = useState(false);

	const fetchJobStatus = async () => {
		try {
			const response = await fetch(`/api/lecoder/status/${jobId}`);

			if (!response.ok) {
				throw new Error("Failed to fetch job status");
			}

			const data = await response.json();
			setJobData(data);
			setIsLoading(false);
		} catch (error) {
			console.error("Error fetching job status:", error);
			toast.error("Failed to fetch job status");
			setIsLoading(false);
		}
	};

	useEffect(() => {
		fetchJobStatus();

		// Poll for updates every 10 seconds if job is not completed or failed
		const interval = setInterval(() => {
			if (jobData && (jobData.status === "completed" || jobData.status === "failed")) {
				clearInterval(interval);
				return;
			}
			fetchJobStatus();
		}, 10000);

		return () => clearInterval(interval);
	}, [jobId, jobData?.status]);

	const handleDownload = async () => {
		if (!jobData?.result?.download_url) return;

		setIsDownloading(true);
		try {
			const response = await fetch(`/api/lecoder/download/${jobId}`);

			if (!response.ok) {
				throw new Error("Failed to download result");
			}

			const blob = await response.blob();
			const url = window.URL.createObjectURL(blob);
			const a = document.createElement("a");
			a.href = url;
			a.download = `reproduction_${jobId}.zip`;
			document.body.appendChild(a);
			a.click();
			window.URL.revokeObjectURL(url);
			document.body.removeChild(a);

			toast.success("Download started!");
		} catch (error) {
			console.error("Error downloading result:", error);
			toast.error("Failed to download result");
		} finally {
			setIsDownloading(false);
		}
	};

	const getStatusIcon = () => {
		if (!jobData) return null;

		switch (jobData.status) {
			case "completed":
				return <CheckCircle2 className="h-12 w-12 text-green-600" />;
			case "failed":
				return <XCircle className="h-12 w-12 text-red-600" />;
			default:
				return <Loader2 className="h-12 w-12 text-blue-600 animate-spin" />;
		}
	};

	const getStatusColor = () => {
		if (!jobData) return "default";

		switch (jobData.status) {
			case "completed":
				return "default" as const;
			case "failed":
				return "destructive" as const;
			case "analyzing":
				return "secondary" as const;
			case "generating":
				return "secondary" as const;
			case "validating":
				return "secondary" as const;
			case "packaging":
				return "secondary" as const;
			default:
				return "outline" as const;
		}
	};

	if (isLoading) {
		return (
			<Card className="max-w-2xl mx-auto">
				<CardContent className="py-12">
					<div className="flex flex-col items-center justify-center space-y-4">
						<Loader2 className="h-12 w-12 text-primary animate-spin" />
						<p className="text-muted-foreground">Loading job status...</p>
					</div>
				</CardContent>
			</Card>
		);
	}

	if (!jobData) {
		return (
			<Card className="max-w-2xl mx-auto">
				<CardContent className="py-12">
					<div className="flex flex-col items-center justify-center space-y-4">
						<XCircle className="h-12 w-12 text-destructive" />
						<p className="text-muted-foreground">Job not found</p>
						<Button onClick={onNewJob}>Create New Job</Button>
					</div>
				</CardContent>
			</Card>
		);
	}

	return (
		<Card className="max-w-2xl mx-auto">
			<CardHeader>
				<div className="flex items-center justify-between">
					<div>
						<CardTitle>Reproduction Job Status</CardTitle>
						<CardDescription className="flex items-center gap-2 mt-2">
							Job ID: <code className="text-xs">{jobId}</code>
						</CardDescription>
					</div>
					<Badge variant={getStatusColor()}>
						{jobData.status.toUpperCase()}
					</Badge>
				</div>
			</CardHeader>
			<CardContent className="space-y-6">
				{/* Status Icon */}
				<div className="flex justify-center py-4">{getStatusIcon()}</div>

				{/* Progress Bar */}
				{jobData.status !== "completed" && jobData.status !== "failed" && (
					<div className="space-y-2">
						<div className="flex justify-between text-sm">
							<span className="text-muted-foreground">Progress</span>
							<span className="font-medium">{jobData.progress}%</span>
						</div>
						<Progress value={jobData.progress} className="h-2" />
					</div>
				)}

				{/* Current Stage */}
				<div className="text-center">
					<p className="text-sm text-muted-foreground">{jobData.current_stage}</p>
				</div>

				{/* Error Message */}
				{jobData.status === "failed" && jobData.error && (
					<div className="p-4 border border-destructive/50 bg-destructive/10 rounded-lg">
						<p className="text-sm text-destructive font-medium mb-1">
							Error:
						</p>
						<p className="text-sm">{jobData.error}</p>
					</div>
				)}

				{/* Result Details */}
				{jobData.status === "completed" && jobData.result && (
					<div className="space-y-4">
						<div className="p-4 border border-green-500/50 bg-green-500/10 rounded-lg space-y-3">
							<div className="flex items-center justify-between">
								<div className="flex items-center gap-2">
									<FileCode className="h-5 w-5 text-green-600" />
									<span className="font-medium">Files Generated:</span>
								</div>
								<span className="text-lg font-bold">
									{jobData.result.files_generated}
								</span>
							</div>
							<div className="flex items-center justify-between">
								<div className="flex items-center gap-2">
									<Clock className="h-5 w-5 text-blue-600" />
									<span className="font-medium">Time Taken:</span>
								</div>
								<span className="text-lg font-bold">
									{Math.floor(jobData.result.time_taken / 60)}m{" "}
									{jobData.result.time_taken % 60}s
								</span>
							</div>
							<div className="pt-2 border-t">
								<p className="text-xs text-muted-foreground">
									Download expires:{" "}
									{new Date(jobData.result.expires_at).toLocaleDateString()}
								</p>
							</div>
						</div>

						{/* Download Button */}
						<Button
							onClick={handleDownload}
							disabled={isDownloading}
							size="lg"
							className="w-full"
						>
							{isDownloading ? (
								<>
									<Loader2 className="mr-2 h-5 w-5 animate-spin" />
									Downloading...
								</>
							) : (
								<>
									<Download className="mr-2 h-5 w-5" />
									Download Reproduction Package
								</>
							)}
						</Button>
					</div>
				)}

				{/* Action Buttons */}
				<div className="flex gap-2 pt-4">
					<Button
						variant="outline"
						onClick={fetchJobStatus}
						disabled={jobData.status === "completed" || jobData.status === "failed"}
						className="flex-1"
					>
						<RefreshCw className="mr-2 h-4 w-4" />
						Refresh Status
					</Button>
					<Button variant="outline" onClick={onNewJob} className="flex-1">
						Create New Job
					</Button>
				</div>

				{/* Metadata */}
				<div className="pt-4 border-t text-xs text-muted-foreground space-y-1">
					<p>Created: {new Date(jobData.created_at).toLocaleString()}</p>
					<p>Last Updated: {new Date(jobData.updated_at).toLocaleString()}</p>
				</div>
			</CardContent>
		</Card>
	);
}
