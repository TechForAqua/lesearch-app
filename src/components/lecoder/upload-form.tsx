"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "z od";
import { Loader2, Upload, FileText, Github, Target } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
	Card,
	CardContent,
	CardDescription,
	CardHeader,
	CardTitle,
} from "@/components/ui/card";
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from "@/components/ui/select";

const formSchema = z.object({
	paperUrl: z.string().url("Please enter a valid URL").optional().or(z.literal("")),
	repoUrl: z.string().url("Please enter a valid GitHub repository URL"),
	userIntent: z.string().min(10, "Please describe your goal (at least 10 characters)"),
	modelPreference: z.enum(["claude", "gemini"]).default("claude"),
});

type FormValues = z.infer<typeof formSchema>;

interface UploadFormProps {
	onJobCreated: (jobId: string) => void;
}

export function UploadForm({ onJobCreated }: UploadFormProps) {
	const [isSubmitting, setIsSubmitting] = useState(false);

	const {
		register,
		handleSubmit,
		formState: { errors },
		setValue,
		watch,
	} = useForm<FormValues>({
		resolver: zodResolver(formSchema),
		defaultValues: {
			paperUrl: "",
			repoUrl: "",
			userIntent: "",
			modelPreference: "claude",
		},
	});

	const modelPreference = watch("modelPreference");

	const onSubmit = async (data: FormValues) => {
		setIsSubmitting(true);

		try {
			// Call Next.js API endpoint (we'll create this next)
			const response = await fetch("/api/lecoder/create", {
				method: "POST",
				headers: {
					"Content-Type": "application/json",
				},
				body: JSON.stringify({
					paper_url: data.paperUrl || undefined,
					repo_url: data.repoUrl,
					user_intent: data.userIntent,
					model_preference: data.modelPreference,
				}),
			});

			if (!response.ok) {
				const error = await response.json();
				throw new Error(error.message || "Failed to create reproduction job");
			}

			const result = await response.json();

			toast.success("Reproduction job created successfully!", {
				description: "Your job is now being processed. This may take 30-60 minutes.",
			});

			onJobCreated(result.job_id);
		} catch (error) {
			console.error("Error creating job:", error);
			toast.error("Failed to create reproduction job", {
				description:
					error instanceof Error ? error.message : "Please try again later",
			});
		} finally {
			setIsSubmitting(false);
		}
	};

	return (
		<Card className="max-w-2xl mx-auto">
			<CardHeader>
				<CardTitle>Create Reproduction Job</CardTitle>
				<CardDescription>
					Provide details about the paper and repository you want to reproduce
				</CardDescription>
			</CardHeader>
			<CardContent>
				<form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
					{/* Paper URL */}
					<div className="space-y-2">
						<Label htmlFor="paperUrl" className="flex items-center gap-2">
							<FileText className="h-4 w-4" />
							Paper URL (Optional)
						</Label>
						<Input
							id="paperUrl"
							placeholder="https://arxiv.org/abs/1706.03762"
							{...register("paperUrl")}
							disabled={isSubmitting}
						/>
						{errors.paperUrl && (
							<p className="text-sm text-destructive">{errors.paperUrl.message}</p>
						)}
						<p className="text-xs text-muted-foreground">
							arXiv URL or direct PDF link. Leave empty if the repository contains
							the paper.
						</p>
					</div>

					{/* Repository URL */}
					<div className="space-y-2">
						<Label htmlFor="repoUrl" className="flex items-center gap-2">
							<Github className="h-4 w-4" />
							GitHub Repository URL *
						</Label>
						<Input
							id="repoUrl"
							placeholder="https://github.com/tensorflow/tensor2tensor"
							{...register("repoUrl")}
							disabled={isSubmitting}
						/>
						{errors.repoUrl && (
							<p className="text-sm text-destructive">{errors.repoUrl.message}</p>
						)}
						<p className="text-xs text-muted-foreground">
							GitHub repository containing the research paper's code
						</p>
					</div>

					{/* User Intent */}
					<div className="space-y-2">
						<Label htmlFor="userIntent" className="flex items-center gap-2">
							<Target className="h-4 w-4" />
							What do you want to achieve? *
						</Label>
						<Textarea
							id="userIntent"
							placeholder="I want to reproduce the Transformer model results from the 'Attention is All You Need' paper and understand the training procedure..."
							rows={4}
							{...register("userIntent")}
							disabled={isSubmitting}
						/>
						{errors.userIntent && (
							<p className="text-sm text-destructive">
								{errors.userIntent.message}
							</p>
						)}
						<p className="text-xs text-muted-foreground">
							Describe your goals. Be specific about what results you want to
							reproduce.
						</p>
					</div>

					{/* Model Preference */}
					<div className="space-y-2">
						<Label htmlFor="modelPreference">AI Model Preference</Label>
						<Select
							value={modelPreference}
							onValueChange={(value) =>
								setValue("modelPreference", value as "claude" | "gemini")
							}
							disabled={isSubmitting}
						>
							<SelectTrigger id="modelPreference">
								<SelectValue />
							</SelectTrigger>
							<SelectContent>
								<SelectItem value="claude">
									Claude Sonnet 4.5 (Recommended)
								</SelectItem>
								<SelectItem value="gemini">Google Gemini 1.5 Pro</SelectItem>
							</SelectContent>
						</Select>
						<p className="text-xs text-muted-foreground">
							Choose which AI model to use for code generation
						</p>
					</div>

					{/* Submit Button */}
					<Button
						type="submit"
						className="w-full"
						size="lg"
						disabled={isSubmitting}
					>
						{isSubmitting ? (
							<>
								<Loader2 className="mr-2 h-5 w-5 animate-spin" />
								Creating Job...
							</>
						) : (
							<>
								<Upload className="mr-2 h-5 w-5" />
								Start Reproduction
							</>
						)}
					</Button>

					<p className="text-xs text-center text-muted-foreground">
						Processing typically takes 30-60 minutes. You can close this page and
						check back later.
					</p>
				</form>
			</CardContent>
		</Card>
	);
}
