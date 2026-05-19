import { zodResolver } from "@hookform/resolvers/zod";
import { motion } from "framer-motion";
import { BriefcaseBusiness, LockKeyhole, Sparkles } from "lucide-react";
import { useState } from "react";
import { Controller, useForm } from "react-hook-form";
import { Navigate, useLocation, useNavigate } from "react-router-dom";
import { toast } from "sonner";
import { z } from "zod";
import { authApi, getApiError } from "@/api/client";
import type { UserRole } from "@/api/types";
import { useAuth } from "@/app/auth-context";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { FormField } from "@/components/ui/form-field";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

const loginSchema = z.object({
  email: z.string().email("Enter a valid email address."),
  password: z.string().min(1, "Password is required."),
});

const registerSchema = z.object({
  full_name: z.string().trim().min(1, "Full name is required."),
  email: z.string().email("Enter a valid email address."),
  password: z
    .string()
    .min(8, "Password must be at least 8 characters.")
    .regex(/[A-Z]/, "Add one uppercase letter.")
    .regex(/[a-z]/, "Add one lowercase letter.")
    .regex(/[0-9]/, "Add one number.")
    .regex(/[!@#$%^&*()\-_=+\[\]{};:,.<>?/\\|`~]/, "Add one special character."),
  role: z.enum(["candidate", "hr"]),
  hr_invite_code: z.string().optional(),
});

type LoginValues = z.infer<typeof loginSchema>;
type RegisterValues = z.infer<typeof registerSchema>;

export default function AuthPage() {
  const { user, setSession } = useAuth();
  const [mode, setMode] = useState<"login" | "register">("login");
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const navigate = useNavigate();
  const location = useLocation();

  const loginForm = useForm<LoginValues>({
    resolver: zodResolver(loginSchema),
    defaultValues: { email: "", password: "" },
  });
  const registerForm = useForm<RegisterValues>({
    resolver: zodResolver(registerSchema),
    defaultValues: {
      full_name: "",
      email: "",
      password: "",
      role: "candidate",
      hr_invite_code: "",
    },
  });

  if (user) {
    return <Navigate to={user.role === "hr" ? "/hr" : "/candidate/jobs"} replace />;
  }

  async function login(values: LoginValues) {
    setIsSubmitting(true);
    setError(null);
    try {
      const session = await authApi.login(values);
      setSession(session);
      const fallback = session.user.role === "hr" ? "/hr" : "/candidate/jobs";
      const target = (location.state as { from?: { pathname?: string } } | null)?.from?.pathname || fallback;
      navigate(target, { replace: true });
      toast.success(`Welcome back, ${session.user.full_name}`);
    } catch (err) {
      setError(getApiError(err));
    } finally {
      setIsSubmitting(false);
    }
  }

  async function register(values: RegisterValues) {
    setIsSubmitting(true);
    setError(null);
    try {
      await authApi.register({
        ...values,
        hr_invite_code: values.role === "hr" ? values.hr_invite_code : undefined,
      });
      const session = await authApi.login({ email: values.email, password: values.password });
      setSession(session);
      navigate(session.user.role === "hr" ? "/hr" : "/candidate/jobs", { replace: true });
      toast.success("Account created");
    } catch (err) {
      setError(getApiError(err));
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <main className="min-h-screen bg-[radial-gradient(circle_at_top_left,hsl(var(--primary)/0.18),transparent_34%),linear-gradient(135deg,#f8fafc_0%,#eef2ff_45%,#ecfeff_100%)] px-4 py-8">
      <div className="mx-auto grid min-h-[calc(100vh-4rem)] max-w-6xl items-center gap-8 lg:grid-cols-[1.05fr_0.95fr]">
        <motion.section
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.45 }}
          className="space-y-8"
        >
          <div className="inline-flex items-center gap-2 rounded-full border bg-white/70 px-3 py-1 text-sm font-medium shadow-sm backdrop-blur">
            <Sparkles className="h-4 w-4 text-primary" />
            Production-ready recruitment workspace
          </div>
          <div className="max-w-2xl space-y-5">
            <div className="flex items-center gap-3">
              <span className="grid h-12 w-12 place-items-center rounded-lg bg-primary text-primary-foreground shadow-lg">
                <BriefcaseBusiness className="h-6 w-6" />
              </span>
              <span className="text-xl font-semibold">RecruitFlow</span>
            </div>
            <h1 className="text-4xl font-semibold tracking-tight text-slate-950 sm:text-5xl">
              Move hiring from scattered updates to one clear workflow.
            </h1>
            <p className="text-base leading-7 text-slate-600">
              HR teams can publish roles and review candidates. Applicants can discover jobs,
              submit applications, and follow each status change from a focused dashboard.
            </p>
          </div>
          <div className="grid gap-3 sm:grid-cols-3">
            {["Role-based access", "Live API data", "Docker-first setup"].map((item) => (
              <div
                key={item}
                className="rounded-lg border bg-white/75 p-4 text-sm font-semibold shadow-sm backdrop-blur"
              >
                {item}
              </div>
            ))}
          </div>
        </motion.section>

        <motion.div
          initial={{ opacity: 0, scale: 0.98 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.35, delay: 0.08 }}
        >
          <Card className="rounded-lg border-white/70 bg-white/90 shadow-2xl backdrop-blur">
            <CardContent className="p-6 sm:p-8">
              <div className="mb-6 grid grid-cols-2 rounded-lg bg-muted p-1">
                <Button
                  type="button"
                  variant={mode === "login" ? "default" : "ghost"}
                  onClick={() => setMode("login")}
                >
                  Sign in
                </Button>
                <Button
                  type="button"
                  variant={mode === "register" ? "default" : "ghost"}
                  onClick={() => setMode("register")}
                >
                  Create account
                </Button>
              </div>
              {error ? (
                <Alert variant="destructive" className="mb-5">
                  <LockKeyhole className="h-4 w-4" />
                  <AlertDescription>{error}</AlertDescription>
                </Alert>
              ) : null}

              {mode === "login" ? (
                <form className="space-y-4" onSubmit={loginForm.handleSubmit(login)}>
                  <FormField label="Email" error={loginForm.formState.errors.email?.message} required>
                    <Input type="email" autoComplete="email" {...loginForm.register("email")} />
                  </FormField>
                  <FormField label="Password" error={loginForm.formState.errors.password?.message} required>
                    <Input type="password" autoComplete="current-password" {...loginForm.register("password")} />
                  </FormField>
                  <Button type="submit" className="w-full" disabled={isSubmitting}>
                    Sign in
                  </Button>
                </form>
              ) : (
                <form className="space-y-4" onSubmit={registerForm.handleSubmit(register)}>
                  <FormField label="Full name" error={registerForm.formState.errors.full_name?.message} required>
                    <Input autoComplete="name" {...registerForm.register("full_name")} />
                  </FormField>
                  <FormField label="Email" error={registerForm.formState.errors.email?.message} required>
                    <Input type="email" autoComplete="email" {...registerForm.register("email")} />
                  </FormField>
                  <FormField label="Password" error={registerForm.formState.errors.password?.message} required>
                    <Input type="password" autoComplete="new-password" {...registerForm.register("password")} />
                  </FormField>
                  <FormField label="Role" error={registerForm.formState.errors.role?.message} required>
                    <Controller
                      control={registerForm.control}
                      name="role"
                      render={({ field }) => (
                        <Select value={field.value} onValueChange={(value) => field.onChange(value as UserRole)}>
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="candidate">Candidate</SelectItem>
                            <SelectItem value="hr">HR</SelectItem>
                          </SelectContent>
                        </Select>
                      )}
                    />
                  </FormField>
                  {registerForm.watch("role") === "hr" ? (
                    <FormField
                      label="HR invite code"
                      error={registerForm.formState.errors.hr_invite_code?.message}
                    >
                      <Input {...registerForm.register("hr_invite_code")} />
                    </FormField>
                  ) : null}
                  <Button type="submit" className="w-full" disabled={isSubmitting}>
                    Create account
                  </Button>
                </form>
              )}
            </CardContent>
          </Card>
        </motion.div>
      </div>
    </main>
  );
}
