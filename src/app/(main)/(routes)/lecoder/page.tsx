"use client";

import { useState } from "react";
import { Sparkles, FileText, Github, ArrowRight } from "lucide-react";
import { UploadForm } from "@/components/lecoder/upload-form";
import { JobStatus } from "@/components/lecoder/job-status";
import { Button } from "@/components/ui/button";

export default function LeCoderPage() {
	const [activeJobId, setActiveJobId] = useState<string | null>(null);
	const [showUploadForm, setShowUploadForm] = useState(false);

	const handleJobCreated = (jobId: string) => {
		setActiveJobId(jobId);
		setShowUploadForm(false);
	};

	const handleNewJob = () => {
		setActiveJobId(null);
		setShowUploadForm(true);
	};

	return (
		<div className="w-full min-h-screen bg-background">
			<div className="max-w-5xl mx-auto px-4 md:px-6 py-8">
				{/* Header */}
				<div className="mb-12 text-center animate-fade-in">
					<div className="flex items-center justify-center mb-4">
						<div className="bg-gradient-to-r from-blue-600 to-purple-600 p-3 rounded-2xl">
							<Sparkles className="h-8 w-8 text-white" />
						</div>
					</div>
					<h1 className="text-4xl font-bold mb-3 bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
						LeCodeR
					</h1>
					<p className="text-lg text-muted-foreground mb-2">
						Research Code Reproducer
					</p>
					<p className="text-sm text-muted-foreground max-w-2xl mx-auto">
						Transform research papers into working code automatically. Powered by
						AI, our system analyzes papers, generates reproduction code, and
						packages everything you need.
					</p>
				</div>

				{/* Features Grid */}
				<div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-12 animate-fade-in-up">
					<div className="border rounded-lg p-4 hover:border-primary/50 transition-colors">
						<FileText className="h-8 w-8 text-blue-600 mb-3" />
						<h3 className="font-semibold mb-2">Paper Analysis</h3>
						<p className="text-sm text-muted-foreground">
							Automatically extract methodology, architecture, and dependencies
							from research papers
						</p>
					</div>
					<div className="border rounded-lg p-4 hover:border-primary/50 transition-colors">
						<Github className="h-8 w-8 text-purple-600 mb-3" />
						<h3 className="font-semibold mb-2">Code Generation</h3>
						<p className="text-sm text-muted-foreground">
							Generate reproduction code with setup instructions and Agent.md for
							AI assistants
						</p>
					</div>
					<div className="border rounded-lg p-4 hover:border-primary/50 transition-colors">
						<ArrowRight className="h-8 w-8 text-green-600 mb-3" />
						<h3 className="font-semibold mb-2">One-Click Download</h3>
						<p className="text-sm text-muted-foreground">
							Get a complete package with code, dependencies, and documentation
							in one ZIP file
						</p>
					</div>
				</div>

				{/* Stats */}
				<div className="flex justify-center gap-8 mb-12 animate-fade-in-up delay-100">
					<div className="text-center">
						<div className="text-3xl font-bold text-primary">80%</div>
						<div className="text-sm text-muted-foreground">Time Saved</div>
					</div>
					<div className="text-center">
						<div className="text-3xl font-bold text-primary">30-60min</div>
						<div className="text-sm text-muted-foreground">Processing Time</div>
					</div>
					<div className="text-center">
						<div className="text-3xl font-bold text-primary">7 days</div>
						<div className="text-sm text-muted-foreground">File Storage</div>
					</div>
				</div>

				{/* Main Content */}
				<div className="animate-fade-in-up delay-200">
					{!activeJobId && !showUploadForm && (
						<div className="text-center py-12">
							<Button
								size="lg"
								onClick={handleNewJob}
								className="bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white px-8"
							>
								<Sparkles className="mr-2 h-5 w-5" />
								Start New Reproduction
							</Button>
							<p className="text-sm text-muted-foreground mt-4">
								Upload a paper or provide URLs to get started
							</p>
						</div>
					)}

					{showUploadForm && !activeJobId && (
						<UploadForm onJobCreated={handleJobCreated} />
					)}

					{activeJobId && (
						<div>
							<JobStatus jobId={activeJobId} onNewJob={handleNewJob} />
						</div>
					)}
				</div>

				{/* How it Works */}
				<div className="mt-16 border-t pt-12 animate-fade-in-up delay-300">
					<h2 className="text-2xl font-bold text-center mb-8">
						How It Works
					</h2>
					<div className="grid grid-cols-1 md:grid-cols-4 gap-6">
						<div className="text-center">
							<div className="bg-blue-100 dark:bg-blue-900/20 w-12 h-12 rounded-full flex items-center justify-center mx-auto mb-3">
								<span className="text-blue-600 dark:text-blue-400 font-bold">
									1
								</span>
							</div>
							<h3 className="font-semibold mb-2">Upload</h3>
							<p className="text-sm text-muted-foreground">
								Provide paper PDF or arXiv link and GitHub repository URL
							</p>
						</div>
						<div className="text-center">
							<div className="bg-purple-100 dark:bg-purple-900/20 w-12 h-12 rounded-full flex items-center justify-center mx-auto mb-3">
								<span className="text-purple-600 dark:text-purple-400 font-bold">
									2
								</span>
							</div>
							<h3 className="font-semibold mb-2">Analyze</h3>
							<p className="text-sm text-muted-foreground">
								AI extracts methodology, architecture, and key components
							</p>
						</div>
						<div className="text-center">
							<div className="bg-green-100 dark:bg-green-900/20 w-12 h-12 rounded-full flex items-center justify-center mx-auto mb-3">
								<span className="text-green-600 dark:text-green-400 font-bold">
									3
								</span>
							</div>
							<h3 className="font-semibold mb-2">Generate</h3>
							<p className="text-sm text-muted-foreground">
								Creates reproduction code, setup scripts, and Agent.md
							</p>
						</div>
						<div className="text-center">
							<div className="bg-orange-100 dark:bg-orange-900/20 w-12 h-12 rounded-full flex items-center justify-center mx-auto mb-3">
								<span className="text-orange-600 dark:text-orange-400 font-bold">
									4
								</span>
							</div>
							<h3 className="font-semibold mb-2">Download</h3>
							<p className="text-sm text-muted-foreground">
								Get complete package as ZIP with 7-day access
							</p>
						</div>
					</div>
				</div>

				{/* Beta Notice */}
				<div className="mt-12 p-4 border border-yellow-500/50 bg-yellow-500/10 rounded-lg text-center animate-fade-in-up delay-400">
					<p className="text-sm">
						<span className="font-semibold">Beta Version:</span> LeCodeR is
						currently in development. Processing times may vary, and some features
						are still being refined.
					</p>
				</div>
			</div>
		</div>
	);
}
