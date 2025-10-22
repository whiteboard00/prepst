"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/contexts/AuthContext";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import {
  Field,
  FieldDescription,
  FieldGroup,
  FieldLabel,
} from "@/components/ui/field";
import {
  InputOTP,
  InputOTPGroup,
  InputOTPSeparator,
  InputOTPSlot,
} from "@/components/ui/input-otp";

export function OTPForm({ className, ...props }: React.ComponentProps<"div">) {
  const [otp, setOtp] = useState("");
  const [email, setEmail] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [resendCooldown, setResendCooldown] = useState(0);
  const { verifyOTP, resendOTP } = useAuth();
  const router = useRouter();

  // Get email from URL params or sessionStorage
  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    const emailParam = urlParams.get("email");
    const storedEmail = sessionStorage.getItem("pendingEmail");

    if (emailParam) {
      setEmail(emailParam);
      sessionStorage.setItem("pendingEmail", emailParam);
    } else if (storedEmail) {
      setEmail(storedEmail);
    }
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    if (!email) {
      setError("Email not found. Please try signing up again.");
      setLoading(false);
      return;
    }

    try {
      await verifyOTP(otp, email);
      sessionStorage.removeItem("pendingEmail");
      router.push("/onboard");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Verification failed");
    } finally {
      setLoading(false);
    }
  };

  const handleResend = async () => {
    if (resendCooldown > 0) {
      setError(
        `Please wait ${resendCooldown} seconds before requesting another code.`
      );
      return;
    }

    setError("");
    setLoading(true);

    if (!email) {
      setError("Email not found. Please try signing up again.");
      setLoading(false);
      return;
    }

    try {
      await resendOTP(email);
      setResendCooldown(60); // 60 second cooldown

      // Start countdown timer
      const timer = setInterval(() => {
        setResendCooldown((prev) => {
          if (prev <= 1) {
            clearInterval(timer);
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to resend code");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div
      className={cn("flex flex-col gap-6 md:min-h-[450px]", className)}
      {...props}
    >
      <Card className="flex-1 overflow-hidden p-0">
        <CardContent className="grid flex-1 p-0 md:grid-cols-2">
          <form
            className="flex flex-col items-center justify-center p-6 md:p-8"
            onSubmit={handleSubmit}
          >
            <FieldGroup>
              <Field className="items-center text-center">
                <h1 className="text-2xl font-bold">Enter verification code</h1>
                <p className="text-muted-foreground text-sm text-balance">
                  We sent a 6-digit code to your email
                </p>
              </Field>

              {error && (
                <div className="text-sm text-red-600 bg-red-50 p-4 rounded-xl border border-red-100">
                  {error}
                </div>
              )}

              <Field className="flex flex-col items-center">
                <FieldLabel htmlFor="otp" className="sr-only">
                  Verification code
                </FieldLabel>
                <InputOTP
                  maxLength={6}
                  id="otp"
                  value={otp}
                  onChange={setOtp}
                  required
                  containerClassName="gap-2 justify-center"
                >
                  <InputOTPGroup>
                    <InputOTPSlot index={0} />
                    <InputOTPSlot index={1} />
                    <InputOTPSlot index={2} />
                    <InputOTPSlot index={3} />
                    <InputOTPSlot index={4} />
                    <InputOTPSlot index={5} />
                  </InputOTPGroup>
                </InputOTP>
                <FieldDescription className="text-center">
                  Enter the 6-digit code sent to your email.
                </FieldDescription>
              </Field>

              <Field>
                <Button
                  type="submit"
                  className="w-full bg-gradient-to-r from-violet-500 to-violet-600 hover:from-violet-600 hover:to-violet-700"
                  disabled={loading || otp.length !== 6}
                >
                  {loading ? "Verifying..." : "Verify"}
                </Button>
                <FieldDescription className="text-center">
                  Didn&apos;t receive the code?{" "}
                  <button
                    type="button"
                    onClick={handleResend}
                    disabled={resendCooldown > 0 || loading}
                    className={`text-violet-600 hover:text-violet-700 ${
                      resendCooldown > 0 ? "opacity-50 cursor-not-allowed" : ""
                    }`}
                  >
                    {resendCooldown > 0
                      ? `Resend in ${resendCooldown}s`
                      : "Resend"}
                  </button>
                </FieldDescription>
              </Field>
            </FieldGroup>
          </form>
          <div className="bg-gradient-to-br from-violet-50 to-violet-100 relative hidden md:block">
            <img
              src="/hero.png"
              alt="SAT Prep Hero Image"
              className="absolute inset-0 h-full w-full object-cover"
            />
            <div className="relative h-full flex items-center justify-center p-8">
              <div className="text-center text-black">
                <div className="inline-flex items-center justify-center w-20 h-20 bg-white/20 backdrop-blur-sm rounded-3xl mb-6">
                  <span className="text-4xl font-bold">P</span>
                </div>
                <h2
                  className="text-3xl font-bold mb-4"
                  style={{
                    fontFamily:
                      "SF Pro Display, -apple-system, BlinkMacSystemFont, sans-serif",
                  }}
                >
                  Verify Your Account
                </h2>
                <p
                  className="text-lg opacity-90"
                  style={{
                    fontFamily:
                      "SF Pro Text, -apple-system, BlinkMacSystemFont, sans-serif",
                  }}
                >
                  Check your email for the verification code
                </p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
      <FieldDescription className="text-center">
        By clicking continue, you agree to our <a href="#">Terms of Service</a>{" "}
        and <a href="#">Privacy Policy</a>.
      </FieldDescription>
    </div>
  );
}
