import { motion } from "framer-motion";
import { BriefcaseBusiness, CheckCircle2, Loader2, Sparkles } from "lucide-react";
import { useState } from "react";
import { Navigate, useLocation, useNavigate } from "react-router-dom";
import { toast } from "sonner";
import { authApi, getApiError } from "@/api/client";
import { useAuth } from "@/app/auth-context";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { FormField } from "@/components/ui/form-field";
import { Input } from "@/components/ui/input";

export default function AuthPage() {
  const { user, setSession } = useAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const navigate = useNavigate();
  const location = useLocation();

  if (user) {
    return <Navigate to={user.role === "hr" ? "/hr" : "/candidate/jobs"} replace />;
  }

  async function login(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setIsSubmitting(true);
    setError(null);
    try {
      const session = await authApi.login({
        email,
        password,
      });
      setSession(session.user);
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

  return (
    <main className="relative min-h-screen overflow-hidden bg-[#f7f9fb] px-4 py-8 text-[#091426]">
      <motion.div
        aria-hidden
        className="absolute left-[-12rem] top-[-14rem] h-[32rem] w-[32rem] rounded-full bg-blue-200/45 blur-3xl"
        animate={{ x: [0, 36, 0], y: [0, 24, 0], scale: [1, 1.08, 1] }}
        transition={{ duration: 12, repeat: Infinity, ease: "easeInOut" }}
      />
      <motion.div
        aria-hidden
        className="absolute bottom-[-16rem] right-[-10rem] h-[34rem] w-[34rem] rounded-full bg-emerald-200/35 blur-3xl"
        animate={{ x: [0, -28, 0], y: [0, -18, 0], scale: [1, 1.1, 1] }}
        transition={{ duration: 14, repeat: Infinity, ease: "easeInOut" }}
      />

      <div className="relative mx-auto grid min-h-[calc(100vh-4rem)] max-w-6xl items-center gap-8 lg:grid-cols-[1.05fr_0.95fr]">
        <motion.section
          initial={{ opacity: 0, y: 18 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="space-y-8"
        >
          <div className="inline-flex items-center gap-2 rounded-full border border-white/70 bg-white/75 px-3 py-1 text-sm font-bold shadow-sm backdrop-blur">
            <Sparkles className="h-4 w-4 text-blue-700" />
            RecruitFlow demo
          </div>

          <div className="max-w-2xl space-y-5">
            <div className="flex items-center gap-3">
              <span className="grid h-12 w-12 place-items-center rounded-lg bg-[#091426] text-white shadow-xl">
                <BriefcaseBusiness className="h-6 w-6" />
              </span>
              <span className="text-xl font-bold">RecruitFlow</span>
            </div>
            <h1 className="text-4xl font-bold tracking-tight text-slate-950 sm:text-6xl">
              Hiring work, tuned for speed and clarity.
            </h1>
            <p className="max-w-xl text-base font-medium leading-7 text-slate-600">
              Review the same product from both sides of the workflow: recruiter operations and candidate discovery.
            </p>
          </div>

          <div className="grid gap-3 sm:grid-cols-3">
            {["Matched jobs", "Candidate profiles", "Hiring analytics"].map((item, index) => (
              <motion.div
                key={item}
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.35, delay: 0.12 + index * 0.06 }}
                className="rounded-lg border border-white/70 bg-white/75 p-4 text-sm font-bold shadow-sm backdrop-blur"
              >
                <CheckCircle2 className="mb-3 h-5 w-5 text-emerald-600" />
                {item}
              </motion.div>
            ))}
          </div>
        </motion.section>

        <motion.section
          initial={{ opacity: 0, x: 24, scale: 0.98 }}
          animate={{ opacity: 1, x: 0, scale: 1 }}
          transition={{ duration: 0.45, delay: 0.08 }}
        >
          <Card className="rounded-xl border-white/80 bg-white/85 shadow-2xl backdrop-blur">
            <CardContent className="space-y-5 p-6 sm:p-8">
              <div>
                <p className="text-sm font-bold uppercase tracking-wide text-blue-700">Sign in</p>
                <h2 className="mt-2 text-2xl font-bold tracking-tight text-slate-950">Sign in to RecruitFlow</h2>
              </div>

              {error ? (
                <Alert variant="destructive">
                  <AlertDescription>{error}</AlertDescription>
                </Alert>
              ) : null}

              <form className="space-y-4" onSubmit={login}>
                <FormField label="Email" required>
                  <Input
                    type="email"
                    autoComplete="email"
                    placeholder="Enter email"
                    required
                    value={email}
                    onChange={(event) => setEmail(event.target.value)}
                  />
                </FormField>
                <FormField label="Password" required>
                  <Input
                    type="password"
                    autoComplete="current-password"
                    placeholder="Enter password"
                    required
                    value={password}
                    onChange={(event) => setPassword(event.target.value)}
                  />
                </FormField>
                <Button type="submit" className="w-full" disabled={isSubmitting}>
                  {isSubmitting ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
                  Login
                </Button>
              </form>
            </CardContent>
          </Card>
        </motion.section>
      </div>
    </main>
  );
}
