import { zodResolver } from "@hookform/resolvers/zod";
import { useEffect } from "react";
import { Controller, useForm } from "react-hook-form";
import { z } from "zod";
import type { Job, JobPayload, JobStatus, JobType } from "@/api/types";
import { Button } from "@/components/ui/button";
import { FormField } from "@/components/ui/form-field";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { jobStatusLabels, jobTypeLabels } from "@/lib/format";

const jobSchema = z
  .object({
    title: z.string().trim().min(2, "Title must be at least 2 characters."),
    description: z.string().trim().min(10, "Description must be at least 10 characters."),
    location: z.string().trim().min(1, "Location is required."),
    job_type: z.enum(["full_time", "part_time", "contract", "internship"]),
    salary_min: z.coerce.number().int().min(0).optional().or(z.literal("")),
    salary_max: z.coerce.number().int().min(0).optional().or(z.literal("")),
    status: z.enum(["open", "closed"]),
  })
  .refine(
    (value) => {
      const min = value.salary_min === "" ? undefined : value.salary_min;
      const max = value.salary_max === "" ? undefined : value.salary_max;
      return min === undefined || max === undefined || max >= min;
    },
    { path: ["salary_max"], message: "Maximum salary must be greater than minimum salary." }
  );

type JobFormValues = z.infer<typeof jobSchema>;

interface JobFormProps {
  job?: Job;
  isSubmitting?: boolean;
  submitLabel: string;
  onSubmit: (payload: JobPayload) => void;
}

const jobTypes = Object.keys(jobTypeLabels) as JobType[];
const jobStatuses = Object.keys(jobStatusLabels) as JobStatus[];

export function JobForm({ job, isSubmitting, submitLabel, onSubmit }: JobFormProps) {
  const {
    register,
    control,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<JobFormValues>({
    resolver: zodResolver(jobSchema),
    defaultValues: {
      title: "",
      description: "",
      location: "",
      job_type: "full_time",
      salary_min: "",
      salary_max: "",
      status: "open",
    },
  });

  useEffect(() => {
    if (job) {
      reset({
        title: job.title,
        description: job.description,
        location: job.location,
        job_type: job.job_type,
        salary_min: job.salary_min ?? "",
        salary_max: job.salary_max ?? "",
        status: job.status,
      });
    }
  }, [job, reset]);

  function submit(values: JobFormValues) {
    onSubmit({
      ...values,
      salary_min: values.salary_min === "" ? null : values.salary_min,
      salary_max: values.salary_max === "" ? null : values.salary_max,
    });
  }

  return (
    <form className="space-y-4" onSubmit={handleSubmit(submit)}>
      <FormField label="Job title" error={errors.title?.message} required>
        <Input placeholder="Job title" {...register("title")} />
      </FormField>
      <div className="grid gap-4 sm:grid-cols-2">
        <FormField label="Location" error={errors.location?.message} required>
          <Input placeholder="Location" {...register("location")} />
        </FormField>
        <FormField label="Job type" error={errors.job_type?.message} required>
          <Controller
            control={control}
            name="job_type"
            render={({ field }) => (
              <Select value={field.value} onValueChange={field.onChange}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {jobTypes.map((type) => (
                    <SelectItem key={type} value={type}>
                      {jobTypeLabels[type]}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
          />
        </FormField>
      </div>
      <div className="grid gap-4 sm:grid-cols-3">
        <FormField label="Minimum salary" error={errors.salary_min?.message}>
          <Input type="number" min={0} placeholder="Minimum salary" {...register("salary_min")} />
        </FormField>
        <FormField label="Maximum salary" error={errors.salary_max?.message}>
          <Input type="number" min={0} placeholder="Maximum salary" {...register("salary_max")} />
        </FormField>
        <FormField label="Status" error={errors.status?.message} required>
          <Controller
            control={control}
            name="status"
            render={({ field }) => (
              <Select value={field.value} onValueChange={field.onChange}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {jobStatuses.map((status) => (
                    <SelectItem key={status} value={status}>
                      {jobStatusLabels[status]}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
          />
        </FormField>
      </div>
      <FormField label="Description" error={errors.description?.message} required>
        <Textarea rows={7} placeholder="Describe the role, expectations, and team..." {...register("description")} />
      </FormField>
      <Button type="submit" className="w-full sm:w-auto" disabled={isSubmitting}>
        {submitLabel}
      </Button>
    </form>
  );
}
