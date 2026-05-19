import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import { FormField } from "@/components/ui/form-field";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";

const applicationSchema = z.object({
  cover_letter: z.string().trim().min(10, "Cover letter must be at least 10 characters."),
  resume_url: z.string().trim().url("Enter a valid URL.").optional().or(z.literal("")),
});

type ApplicationValues = z.infer<typeof applicationSchema>;

interface ApplicationFormProps {
  isSubmitting?: boolean;
  onSubmit: (values: { cover_letter: string; resume_url?: string }) => void;
}

export function ApplicationForm({ isSubmitting, onSubmit }: ApplicationFormProps) {
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<ApplicationValues>({
    resolver: zodResolver(applicationSchema),
    defaultValues: {
      cover_letter: "",
      resume_url: "",
    },
  });

  function submit(values: ApplicationValues) {
    onSubmit({
      cover_letter: values.cover_letter,
      resume_url: values.resume_url || undefined,
    });
  }

  return (
    <form className="space-y-4" onSubmit={handleSubmit(submit)}>
      <FormField label="Cover letter" error={errors.cover_letter?.message} required>
        <Textarea
          rows={8}
          placeholder="Tell the hiring team why this role is a strong match..."
          {...register("cover_letter")}
        />
      </FormField>
      <FormField
        label="Resume URL"
        hint="Use a shareable link to your resume or portfolio."
        error={errors.resume_url?.message}
      >
        <Input placeholder="https://example.com/resume.pdf" {...register("resume_url")} />
      </FormField>
      <Button type="submit" className="w-full sm:w-auto" disabled={isSubmitting}>
        Submit application
      </Button>
    </form>
  );
}
