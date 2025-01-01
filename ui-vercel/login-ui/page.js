import { LoginFormComponent } from "@/components/login/login-form"
import { Logo } from "@/components/login/logo"

export default function LoginPage() {
  return (
    <div className="flex min-h-screen">
      {/* Left side - Preview Section */}
      <div className="relative hidden w-1/2 lg:block">
        <img
          src="/placeholder.svg?height=1080&width=1920"
          alt="Dashboard Preview"
          className="absolute inset-0 h-full w-full object-cover"
        />
        <div className="absolute inset-0 bg-zinc-950/40" />
        <div className="relative z-10 flex h-full flex-col justify-center p-12">
          <h1 className="text-5xl font-bold leading-tight text-white">
            The first eCommerce shop for everyone with A.I.
          </h1>
          <p className="mt-4 text-xl text-white/80">
            Innovative software for AI-assisted shopping management
          </p>
        </div>
      </div>

      {/* Right side - Login Form */}
      <div className="flex w-full flex-col items-center justify-center px-4 sm:px-6 lg:w-1/2 lg:px-8">
        <div className="w-full max-w-sm">
          <div className="flex flex-col items-center space-y-4">
            <Logo />
            <h2 className="text-2xl font-semibold tracking-tight">
              Welcome to SolarCRM
            </h2>
            <p className="text-sm text-muted-foreground">
              Let's sign you in
            </p>
          </div>

          <LoginFormComponent />
        </div>
      </div>
    </div>
  )
}

