"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

<<<<<<< HEAD
import { cx } from "@/lib/utils";
import { requestEmailVerification, signupWithEmail, verifyEmailCode } from "@/lib/auth-api";
import { useBrainX } from "@/components/brainx-provider";
import { Btn, Icon } from "@/components/brainx-ui";
import { AuthShell, Field } from "@/components/public/auth-shared";

type AgreementKey = "tos" | "priv" | "mkt" | "beh";
type VerificationStatus = "idle" | "sent" | "checking" | "verified" | "invalid";
=======
import { EMPTY_CONSENTS, requiredConsentsAccepted, type ConsentState } from "@/lib/legal";
import { checkEmailAvailability, requestEmailVerification, signupWithEmail, verifyEmailCode } from "@/lib/auth-api";
import { useBrainX } from "@/components/brainx-provider";
import { Btn, Icon } from "@/components/brainx-ui";
import { AuthShell, Field } from "@/components/public/auth-shared";
import { LegalConsents } from "@/components/public/legal-consents";

type VerificationStatus = "idle" | "sent" | "checking" | "verified" | "invalid";
type EmailAvailabilityStatus = "idle" | "checking" | "available" | "unavailable";

function getPasswordStrength(password: string) {
  const checks = [
    password.length >= 8,
    /[A-Za-z]/.test(password),
    /\d/.test(password),
    /[^A-Za-z0-9]/.test(password)
  ];
  const passed = checks.filter(Boolean).length;

  if (password.length === 0) {
    return {
      score: 0,
      label: "비밀번호를 입력해 주세요.",
      textClass: "text-txt3",
      barClass: "bg-line/50"
    };
  }
  if (passed <= 2) {
    return {
      score: 1,
      label: "약함 · 영문, 숫자, 특수문자를 포함해 8자 이상 입력해 주세요.",
      textClass: "text-red-400",
      barClass: "bg-red-400"
    };
  }
  if (passed === 3) {
    return {
      score: 2,
      label: "보통 · 한 가지 조건을 더 채우면 안전해요.",
      textClass: "text-amber-500",
      barClass: "bg-amber-400"
    };
  }
  return {
    score: 3,
    label: "안전 · 사용 가능한 비밀번호입니다.",
    textClass: "text-primary",
    barClass: "bg-primary"
  };
}
>>>>>>> main

export function SignupScreen() {
  const router = useRouter();
  const { pushToast } = useBrainX();
  const [email, setEmail] = useState("");
  const [verificationCode, setVerificationCode] = useState("");
  const [password, setPassword] = useState("");
  const [passwordConfirm, setPasswordConfirm] = useState("");
<<<<<<< HEAD
  const [sendingCode, setSendingCode] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [verificationStatus, setVerificationStatus] = useState<VerificationStatus>("idle");
  const [agree, setAgree] = useState<Record<AgreementKey, boolean>>({
    tos: false,
    priv: false,
    mkt: false,
    beh: false
  });

  const terms: Array<{ key: AgreementKey; label: string }> = [
    { key: "tos", label: "[필수] 서비스 이용약관" },
    { key: "priv", label: "[필수] 개인정보 처리방침" },
    { key: "mkt", label: "[선택] 마케팅 정보 수신" },
    { key: "beh", label: "[선택] 행동 데이터 분석 동의" }
  ];

  const codeVerified = verificationStatus === "verified";
  const canSendCode = email.trim().length > 0 && !sendingCode;
=======
  const [emailAvailabilityStatus, setEmailAvailabilityStatus] = useState<EmailAvailabilityStatus>("idle");
  const [checkedEmail, setCheckedEmail] = useState("");
  const [sendingCode, setSendingCode] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [verificationStatus, setVerificationStatus] = useState<VerificationStatus>("idle");
  const [consents, setConsents] = useState<ConsentState>(EMPTY_CONSENTS);

  const codeVerified = verificationStatus === "verified";
  const emailChecked = emailAvailabilityStatus === "available" && checkedEmail === email.trim();
  const passwordStrength = getPasswordStrength(password);
  const passwordMeetsPolicy = passwordStrength.score === 3;
  const passwordConfirmTouched = passwordConfirm.length > 0;
  const passwordMatches = passwordConfirmTouched && password === passwordConfirm;
  const passwordMismatch = passwordConfirmTouched && password !== passwordConfirm;
  const canCheckEmail = email.trim().length > 0 && emailAvailabilityStatus !== "checking" && !submitting;
  const canSendCode = emailChecked && !sendingCode;
>>>>>>> main
  const canCheckCode =
    email.trim().length > 0 &&
    verificationCode.trim().length > 0 &&
    verificationStatus !== "checking" &&
    !submitting;
  const canProceed =
<<<<<<< HEAD
    agree.tos &&
    agree.priv &&
    email.trim().length > 0 &&
    verificationCode.trim().length > 0 &&
    password.length > 0 &&
    passwordConfirm.length > 0 &&
=======
    requiredConsentsAccepted(consents) &&
    email.trim().length > 0 &&
    verificationCode.trim().length > 0 &&
    passwordMeetsPolicy &&
    passwordMatches &&
>>>>>>> main
    codeVerified &&
    !submitting;

  const handleEmailChange = (value: string) => {
    setEmail(value);
<<<<<<< HEAD
=======
    setCheckedEmail("");
    setEmailAvailabilityStatus("idle");
    setVerificationCode("");
>>>>>>> main
    setVerificationStatus("idle");
  };

  const handleCodeChange = (value: string) => {
    setVerificationCode(value);
    setVerificationStatus((current) => (current === "verified" ? "sent" : current));
  };

<<<<<<< HEAD
=======
  const handleCheckEmail = async () => {
    if (!canCheckEmail) return;
    const normalizedEmail = email.trim();
    setEmailAvailabilityStatus("checking");
    try {
      const data = await checkEmailAvailability(normalizedEmail);
      if (!data.available) {
        setCheckedEmail("");
        setEmailAvailabilityStatus("unavailable");
        pushToast("이미 가입된 이메일입니다.", "err");
        return;
      }
      setCheckedEmail(normalizedEmail);
      setEmailAvailabilityStatus("available");
      pushToast("사용 가능한 이메일입니다.", "ok");
    } catch (error) {
      setCheckedEmail("");
      setEmailAvailabilityStatus("idle");
      pushToast(error instanceof Error ? error.message : "이메일 중복 확인에 실패했습니다.", "err");
    }
  };

>>>>>>> main
  const handleSendCode = async () => {
    if (!canSendCode) return;
    setSendingCode(true);
    try {
      await requestEmailVerification(email.trim(), "SIGNUP");
      setVerificationStatus("sent");
      pushToast("인증 코드가 이메일로 발송되었습니다.", "ok");
    } catch (error) {
      setVerificationStatus("idle");
      pushToast(error instanceof Error ? error.message : "인증 코드 요청에 실패했습니다.", "err");
    } finally {
      setSendingCode(false);
    }
  };

  const handleCheckCode = async () => {
    if (!canCheckCode) return;
    setVerificationStatus("checking");
    try {
      await verifyEmailCode(email.trim(), verificationCode.trim(), "SIGNUP");
      setVerificationStatus("verified");
      pushToast("인증 코드가 확인되었습니다.", "ok");
    } catch (error) {
      setVerificationStatus("invalid");
      pushToast(error instanceof Error ? error.message : "인증 코드가 올바르지 않습니다.", "err");
    }
  };

  const handleSignup = async () => {
    if (!canProceed) return;
    if (password !== passwordConfirm) {
      pushToast("비밀번호 확인이 일치하지 않습니다.", "err");
      return;
    }

    setSubmitting(true);
    try {
      const data = await signupWithEmail({
        email: email.trim(),
        verificationCode: verificationCode.trim(),
        password,
        passwordConfirm,
        consents: {
<<<<<<< HEAD
          termsRequired: agree.tos,
          privacyRequired: agree.priv,
          marketingOptional: agree.mkt,
          behaviorAnalyticsOptional: agree.beh
=======
          termsRequired: consents.termsRequired,
          privacyRequired: consents.privacyRequired,
          marketingOptional: consents.marketingOptional,
          behaviorAnalyticsOptional: consents.behaviorAnalyticsOptional
>>>>>>> main
        }
      });
      pushToast("회원가입이 완료되었습니다.", "ok");
      router.push(data.next === "ONBOARDING" ? "/onboarding" : "/home");
    } catch (error) {
      pushToast(error instanceof Error ? error.message : "회원가입에 실패했습니다.", "err");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <AuthShell>
<<<<<<< HEAD
      <h1 className="mb-1.5 text-[26px] font-bold tracking-tight">BrainX 시작하기</h1>
      <p className="mb-7 text-[14px] text-txt2">이메일 인증 후 무료로 계정을 만들 수 있습니다.</p>
      <Field
        label="이메일"
        type="email"
        placeholder="you@brainx.app"
        value={email}
        onChange={(event) => handleEmailChange(event.target.value)}
        autoComplete="email"
        disabled={submitting}
      />
      <div className="mb-1 flex items-end gap-2">
        <div className="min-w-0 flex-1 [&>label]:mb-1">
=======
      <h1 className="mb-1.5 text-[28px] font-bold tracking-tight">두뇌를 깨우는 1분</h1>
      <p className="mb-7 text-[16px] text-txt2">무료로 BrainX를 시작하세요.</p>
      <div className="mb-1 flex items-start gap-2">
        <div className="flex-1 [&>div]:mb-0">
          <Field
            label="이메일"
            type="email"
            placeholder="you@brainx.app"
            value={email}
            onChange={(event) => handleEmailChange(event.target.value)}
            autoComplete="email"
            disabled={submitting}
          />
        </div>
        <Btn variant={emailChecked ? "outline" : "soft"} className="mt-[27px] h-11 px-3" disabled={!canCheckEmail} onClick={handleCheckEmail}>
          {emailAvailabilityStatus === "checking" ? "확인 중..." : emailChecked ? "확인됨" : "중복 확인"}
        </Btn>
      </div>
      {emailAvailabilityStatus === "available" ? (
        <p className="mb-3 inline-flex items-center gap-1 text-[12.5px] font-medium text-primary">
          <Icon name="check" size={13} />
          사용 가능한 이메일입니다.
        </p>
      ) : null}
      {emailAvailabilityStatus === "unavailable" ? (
        <p className="mb-3 break-keep text-[12.5px] leading-snug text-red-400">이미 가입된 이메일입니다. 다른 이메일을 입력해 주세요.</p>
      ) : null}
      <div className="mb-3 flex items-start gap-2">
        <div className="flex-1 [&>div]:mb-0">
>>>>>>> main
          <Field
            label="인증 코드"
            placeholder="6자리 숫자"
            value={verificationCode}
            onChange={(event) => handleCodeChange(event.target.value)}
<<<<<<< HEAD
            autoComplete="one-time-code"
            disabled={submitting}
          />
        </div>
        <Btn variant="soft" className="mb-1 px-3" disabled={!canSendCode || submitting} onClick={handleSendCode}>
          {sendingCode ? "전송 중..." : "코드 전송"}
        </Btn>
        <Btn variant={codeVerified ? "outline" : "soft"} className="mb-1 px-3" disabled={!canCheckCode} onClick={handleCheckCode}>
          {verificationStatus === "checking" ? "확인 중..." : codeVerified ? "확인됨" : "코드 확인"}
        </Btn>
      </div>
      {codeVerified ? (
        <p className="mb-3 inline-flex items-center gap-1 text-[12.5px] font-medium text-primary">
          <Icon name="check" size={13} />
          인증이 완료되었습니다.
        </p>
      ) : null}
      {verificationStatus === "invalid" ? (
        <p className="mb-3 text-[12.5px] text-red-400">인증 코드가 올바르지 않습니다. 다시 확인해 주세요.</p>
      ) : null}
      <Field
        label="비밀번호"
        type="password"
        placeholder="8자 이상"
        value={password}
        onChange={(event) => setPassword(event.target.value)}
        autoComplete="new-password"
        disabled={submitting}
      />
      <Field
        label="비밀번호 확인"
        type="password"
        placeholder="다시 입력"
        value={passwordConfirm}
        onChange={(event) => setPasswordConfirm(event.target.value)}
        autoComplete="new-password"
        disabled={submitting}
      />
      <div className="my-4 space-y-1 rounded-xl bg-surface2/40 p-3">
        {terms.map((term) => (
          <button
            key={term.key}
            type="button"
            onClick={() => setAgree((current) => ({ ...current, [term.key]: !current[term.key] }))}
            className="flex h-8 w-full items-center gap-2.5 text-left"
            disabled={submitting}
          >
            <span
              className={cx(
                "grid h-5 w-5 place-items-center rounded-md border",
                agree[term.key] ? "border-primary bg-primary text-white" : "border-line"
              )}
            >
              {agree[term.key] ? <Icon name="check" size={13} /> : null}
            </span>
            <span className="text-[13px] text-txt2">{term.label}</span>
          </button>
        ))}
      </div>
      <Btn variant="primary" size="lg" className="w-full" disabled={!canProceed} onClick={handleSignup}>
        {submitting ? "가입 중..." : "가입하고 시작하기"}
      </Btn>
      <p className="mt-6 text-center text-[13px] text-txt2">
=======
            disabled={submitting || verificationStatus === "idle"}
          />
          {codeVerified ? (
            <p className="mt-1 inline-flex items-center gap-1 text-[12.5px] font-medium text-primary">
              <Icon name="check" size={13} />
              인증이 완료되었습니다.
            </p>
          ) : null}
          {verificationStatus === "invalid" ? (
            <p className="mt-1 text-[12.5px] text-red-400">인증 코드가 올바르지 않습니다. 다시 확인해 주세요.</p>
          ) : null}
        </div>
        <Btn variant="soft" className="mt-[27px] h-11 px-3" disabled={!canSendCode || submitting} onClick={handleSendCode}>
          {sendingCode ? "전송 중..." : "코드 전송"}
        </Btn>
        <Btn variant={codeVerified ? "outline" : "soft"} className="mt-[27px] h-11 px-3" disabled={!canCheckCode} onClick={handleCheckCode}>
          {verificationStatus === "checking" ? "확인 중..." : codeVerified ? "확인됨" : "코드 확인"}
        </Btn>
      </div>
      <div className="mb-4 [&>div]:mb-0">
        <Field
          label="비밀번호"
          type="password"
          placeholder="8자 이상"
          value={password}
          onChange={(event) => setPassword(event.target.value)}
          autoComplete="new-password"
          disabled={submitting}
        />
        <div className="mt-2 grid grid-cols-3 gap-1">
          {[1, 2, 3].map((step) => (
            <span key={step} className={`h-1.5 rounded-full ${passwordStrength.score >= step ? passwordStrength.barClass : "bg-line/50"}`} />
          ))}
        </div>
        <p className={`mt-1.5 text-[12.5px] leading-snug ${passwordStrength.textClass}`}>{passwordStrength.label}</p>
      </div>
      <div className="mb-4 [&>div]:mb-0">
        <Field
          label="비밀번호 확인"
          type="password"
          placeholder="다시 입력"
          value={passwordConfirm}
          onChange={(event) => setPasswordConfirm(event.target.value)}
          autoComplete="new-password"
          disabled={submitting}
        />
        {passwordMatches ? (
          <p className="mt-1 inline-flex items-center gap-1 text-[12.5px] font-medium text-primary">
            <Icon name="check" size={13} />
            비밀번호가 일치합니다.
          </p>
        ) : null}
        {passwordMismatch ? (
          <p className="mt-1 text-[12.5px] text-red-400">비밀번호 확인이 일치하지 않습니다.</p>
        ) : null}
      </div>
      <LegalConsents value={consents} onChange={setConsents} disabled={submitting} className="my-4" />
      <Btn variant="primary" size="lg" className="w-full" disabled={!canProceed} onClick={handleSignup}>
        {submitting ? "가입 중..." : "가입하고 시작하기"}
      </Btn>
      <p className="mt-6 text-center text-[15px] text-txt2">
>>>>>>> main
        이미 계정이 있으신가요?{" "}
        <button type="button" onClick={() => router.push("/login")} className="font-medium text-primary">
          로그인
        </button>
      </p>
    </AuthShell>
  );
}
