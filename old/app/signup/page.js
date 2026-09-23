"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";

export default function SignupPage() {
    const router = useRouter();

    const [name, setName] = useState("");
    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");

    const [loading, setLoading] = useState(false);
    const [error, setError] = useState("");
    const [success, setSuccess] = useState("");

    async function handleSignup(e) {
        e.preventDefault();

        setError("");
        setSuccess("");

        if (!name || !email || !password) {
            setError("Please fill in all fields.");
            return;
        }

        if (password.length < 6) {
            setError("Password must be at least 6 characters.");
            return;
        }

        try {
            setLoading(true);

            const supabase = createClient();

            const { data, error } = await supabase.auth.signUp({
                email,
                password,
                options: {
                    data: {
                        name,
                    },
                },
            });

            if (error) {
                setError(error.message);
                return;
            }

            /*
             * If email confirmation is disabled,
             * Supabase will immediately create a session.
             */
            if (data.session) {
                router.push("/dashboard");
                router.refresh();
                return;
            }

            /*
             * If email confirmation is enabled,
             * the user needs to confirm their email first.
             */
            setSuccess(
                "Account created. Check your email to confirm your account."
            );
        } catch (err) {
            setError("Something went wrong. Please try again.");
        } finally {
            setLoading(false);
        }
    }

    return (
        <div
            style={{
                minHeight: "100vh",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                background: "var(--bg)",
                padding: 20,
            }}
        >
            <div
                className="card"
                style={{
                    width: 380,
                    padding: 32,
                }}
            >
                <div
                    style={{
                        display: "flex",
                        alignItems: "center",
                        gap: 10,
                        marginBottom: 26,
                    }}
                >
                    <div
                        style={{
                            width: 30,
                            height: 30,
                            borderRadius: 7,
                            background:
                                "linear-gradient(135deg, var(--mint), var(--mint-dim))",
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "center",
                            fontWeight: 800,
                            color: "#04120F",
                        }}
                    >
                        N
                    </div>

                    <span
                        style={{
                            fontWeight: 800,
                            fontSize: 19,
                        }}
                    >
                        NOVA
                    </span>
                </div>

                <h1
                    style={{
                        fontSize: 20,
                        fontWeight: 700,
                        marginBottom: 6,
                    }}
                >
                    Create account
                </h1>

                <p
                    style={{
                        fontSize: 13,
                        color: "var(--muted)",
                        marginBottom: 22,
                    }}
                >
                    Create your NOVA testnet account
                </p>

                <form
                    onSubmit={handleSignup}
                    style={{
                        display: "flex",
                        flexDirection: "column",
                        gap: 12,
                    }}
                >
                    <div>
                        <label style={labelStyle}>Name</label>

                        <input
                            type="text"
                            value={name}
                            onChange={(e) => setName(e.target.value)}
                            placeholder="Your name"
                            style={inputStyle}
                        />
                    </div>

                    <div>
                        <label style={labelStyle}>Email</label>

                        <input
                            type="email"
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                            placeholder="you@example.com"
                            style={inputStyle}
                        />
                    </div>

                    <div>
                        <label style={labelStyle}>Password</label>

                        <input
                            type="password"
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            placeholder="At least 6 characters"
                            style={inputStyle}
                        />
                    </div>

                    {error && (
                        <div
                            style={{
                                color: "var(--coral)",
                                fontSize: 12.5,
                            }}
                        >
                            {error}
                        </div>
                    )}

                    {success && (
                        <div
                            style={{
                                color: "var(--mint)",
                                fontSize: 12.5,
                            }}
                        >
                            {success}
                        </div>
                    )}

                    <button
                        type="submit"
                        className="btn-primary"
                        style={{
                            width: "100%",
                            marginTop: 6,
                        }}
                        disabled={loading}
                    >
                        {loading ? "Creating account..." : "Create account"}
                    </button>
                </form>

                <div
                    style={{
                        textAlign: "center",
                        marginTop: 20,
                        fontSize: 12,
                        color: "var(--muted)",
                    }}
                >
                    Already have an account?{" "}
                    <Link
                        href="/login"
                        style={{
                            color: "var(--mint)",
                            textDecoration: "none",
                        }}
                    >
                        Sign in
                    </Link>
                </div>
            </div>
        </div>
    );
}

const labelStyle = {
    fontSize: 11.5,
    color: "var(--muted)",
    display: "block",
    marginBottom: 5,
};

const inputStyle = {
    width: "100%",
    background: "var(--panel-2)",
    border: "1px solid var(--line)",
    borderRadius: 6,
    padding: "9px 11px",
    color: "var(--text)",
    fontSize: 13.5,
    outline: "none",
};