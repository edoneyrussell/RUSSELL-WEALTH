

import { useState, type FormEvent } from 'react';

const assetPathPrefix = '/assets';
const imgOriginalLogoImage = `${assetPathPrefix}/c8aca.png`;
const imgIosSignal = `${assetPathPrefix}/821c1.svg`;
const imgIosWifiSignal = `${assetPathPrefix}/e65cf.svg`;
const imgIosBatteryFull = `${assetPathPrefix}/e3731.svg`;
const imgMail = `${assetPathPrefix}/38715.svg`;
const imgLockKeyhole = `${assetPathPrefix}/21579.svg`;
const imgEye = `${assetPathPrefix}/74cfc.svg`;
const imgArrowRight = `${assetPathPrefix}/74e94.svg`;
const imgShieldCheck = `${assetPathPrefix}/3f238.svg`;

export default function RussellWealthMobileLogin() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  async function handleLogin(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (loading) return;

    setError('');
    setLoading(true);

    try {
      const response = await fetch('/api/login', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'same-origin',
        body: JSON.stringify({
          email,
          password,
          rememberMe,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        setError(data.error || 'Invalid email or password.');
        return;
      }

      window.location.assign(
        data.role === 'SOC_ADMIN' ? '/security' : '/dashboard'
      );
    } catch {
      setError('Cannot connect to the authentication server.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div
      className="bg-[#08090a] content-stretch flex flex-col items-start relative size-full"
      data-node-id="74:3"
      data-name="Russell Wealth mobile login"
    >
      {/* Ambient background glow */}
      <div
        className="absolute h-[400px] left-0 top-[50px] w-[393px] pointer-events-none"
        style={{
          backgroundImage:
            "url(\"data:image/svg+xml;utf8,<svg viewBox='0 0 393 400' xmlns='http://www.w3.org/2000/svg' preserveAspectRatio='none'><rect x='0' y='0' height='100%' width='100%' fill='url(%23grad)' opacity='1'/><defs><radialGradient id='grad' gradientUnits='userSpaceOnUse' cx='0' cy='0' r='10' gradientTransform='matrix(19.65 20 -19.65 20 196.5 160)'><stop stop-color='rgba(155,120,69,0.10196)' offset='0'/><stop stop-color='rgba(8,9,10,0)' offset='1'/></radialGradient></defs></svg>\")",
        }}
        data-name="Ambient glow"
      />

      {/* Status bar */}
      <div
        className="content-stretch flex h-[54px] items-center justify-between overflow-clip pt-[4px] px-[28px] relative shrink-0 w-full"
        data-name="Status bar"
      >
        <p className="font-['Inter:Semi_Bold'] font-semibold text-[#f4f0e7] text-[15px]">
          9:41
        </p>

        <div className="content-stretch flex gap-[6px] items-center relative shrink-0">
          <img
            alt=""
            className="size-[17px]"
            src={imgIosSignal}
          />
          <img
            alt=""
            className="size-[17px]"
            src={imgIosWifiSignal}
          />
          <img
            alt=""
            className="h-[17px] w-[25px]"
            src={imgIosBatteryFull}
          />
        </div>
      </div>

      {/* Login content */}
      <div
        className="content-stretch flex flex-col items-center overflow-clip pt-[55px] px-[28px] relative shrink-0 w-full"
        data-name="Login content"
      >
        {/* Logo */}
        <div className="content-stretch flex flex-col gap-[5px] items-center relative shrink-0 w-full">
          <div className="h-[104px] overflow-clip relative shrink-0 w-[320px]">
            <div className="absolute h-[157.63px] left-[-36.74px] top-[-31.41px] w-[393.481px]">
              <img
                alt="Russell Wealth"
                className="absolute inset-0 max-w-none object-cover pointer-events-none size-full"
                src={imgOriginalLogoImage}
              />
            </div>
          </div>

          <div className="flex items-start pt-[19px]">
            <div className="bg-[#c5cad2] h-px w-[38px]" />
          </div>
        </div>

        {/* Heading */}
        <div className="content-stretch flex flex-col gap-[10px] items-center pb-[30px] pt-[42px] text-center w-full">
          <p className="font-['Cinzel:Bold'] font-bold text-[#f5f5f5] text-[31px] w-full">
            Sign In
          </p>

          <p className="font-['Inter:Regular'] font-normal leading-[1.5] text-[#b4b8c0] text-[13px] w-full">
            Access your Russell Wealth account
          </p>
        </div>

        {/* Login form */}
        <form
          onSubmit={handleLogin}
          className="content-stretch flex flex-col gap-[20px] items-start relative shrink-0 w-full"
          data-name="Sign in form"
        >
          {/* Email */}
          <div className="content-stretch flex flex-col gap-[10px] items-start w-full">
            <label
              htmlFor="rw-email"
              className="font-['Inter:Semi_Bold'] font-semibold text-[#f5f5f5] text-[12px]"
            >
              Email Address
            </label>

            <div className="bg-[#101216] border border-[#414650] flex gap-[12px] h-[54px] items-center px-[16px] rounded-[9.84px] w-full">
              <img
                alt=""
                className="size-[19.68px]"
                src={imgMail}
              />

              <input
                id="rw-email"
                type="email"
                placeholder="Email Address"
                autoComplete="email"
                required
                value={email}
                onChange={(event) =>
                  setEmail(event.target.value)
                }
                className="flex-1 min-w-0 bg-transparent font-['Inter:Regular'] text-[#f5f5f5] text-[12.3px] outline-none placeholder:text-[#b4b8c0]"
              />
            </div>
          </div>

          {/* Password */}
          <div className="content-stretch flex flex-col gap-[10px] items-start w-full">
            <label
              htmlFor="rw-password"
              className="font-['Inter:Semi_Bold'] font-semibold text-[#f5f5f5] text-[12px]"
            >
              Password
            </label>

            <div className="bg-[#101216] border border-[#414650] flex gap-[12px] h-[54px] items-center px-[16px] rounded-[9.84px] w-full">
              <img
                alt=""
                className="size-[19.68px]"
                src={imgLockKeyhole}
              />

              <input
                id="rw-password"
                type={showPassword ? 'text' : 'password'}
                placeholder="Password"
                autoComplete="current-password"
                required
                value={password}
                onChange={(event) =>
                  setPassword(event.target.value)
                }
                className="flex-1 min-w-0 bg-transparent font-['Inter:Regular'] text-[#f5f5f5] text-[12.3px] outline-none placeholder:text-[#b4b8c0]"
              />

              <button
                type="button"
                onClick={() =>
                  setShowPassword((previous) => !previous)
                }
                aria-label={
                  showPassword
                    ? 'Hide password'
                    : 'Show password'
                }
                className="relative shrink-0 size-[20.5px] cursor-pointer"
              >
                <img
                  alt=""
                  className="size-full"
                  src={imgEye}
                />
              </button>
            </div>
          </div>

          {/* Remember Me and Forgot Password */}
          <div className="flex items-center justify-between w-full">
            <label className="flex gap-[9.84px] items-center cursor-pointer">
              <input
                type="checkbox"
                checked={rememberMe}
                onChange={(event) =>
                  setRememberMe(event.target.checked)
                }
                className="accent-[#c5cad2] bg-[#101216] size-[21.32px]"
              />

              <span className="font-['Inter:Regular'] text-[#b4b8c0] text-[11.48px]">
                Remember Me
              </span>
            </label>

            <span className="font-['Inter:Semi_Bold'] font-semibold text-[#f5f5f5] text-[11.48px]">
              Forgot Password?
            </span>
          </div>

          {/* Sign In button */}
          <button
            type="submit"
            disabled={loading}
            className="bg-gradient-to-b border-[#c5cad2] border-[0.82px] border-solid content-stretch flex from-[#e3e6eb] gap-[19.68px] h-[50.84px] items-center justify-center relative rounded-[82px] shrink-0 to-[#9ea5af] via-[#c5cad2] via-[48%] w-[223px] cursor-pointer disabled:opacity-60"
          >
            <span className="font-['Inter:Semi_Bold'] font-semibold text-[#080a0d] text-[13.12px]">
              {loading ? 'Signing In...' : 'Sign In'}
            </span>

            <img
              alt=""
              className="size-[19.68px]"
              src={imgArrowRight}
            />
          </button>

          {/* Error message */}
          {error && (
            <p
              role="alert"
              className="text-red-400 text-[12px]"
            >
              {error}
            </p>
          )}
        </form>

        {/* Create account */}
        <div className="flex gap-[9.84px] items-center pt-[20px] text-[11.48px]">
          <p className="font-['Inter:Regular'] text-[#b4b8c0]">
            Don’t have an account?
          </p>

          <a
            href="/create-account"
            className="font-['Inter:Semi_Bold'] font-semibold text-[#f5f5f5]"
          >
            Create Account
          </a>
        </div>
      </div>

      {/* Security and support */}
      <div className="flex flex-col gap-[20px] items-center pb-[23px] pt-[57px] px-[28px] w-full">
        <div className="flex gap-[7px] items-center">
          <img
            alt=""
            className="size-[14px]"
            src={imgShieldCheck}
          />

          <p className="font-['Inter:Regular'] text-[#b4b8c0] text-[10px] tracking-[1.5px]">
            PRIVATE. SECURE. YOURS.
          </p>
        </div>

        <div className="flex gap-[14px] items-center text-[#b4b8c0] text-[11px]">
          <span>Contact support</span>
          <div className="bg-[#414650] h-[10px] w-px" />
          <span>Privacy policy</span>
        </div>
      </div>

      {/* Home indicator */}
      <div className="flex h-[28px] items-center justify-center w-full">
        <div className="bg-[#f4f0e7] h-[5px] rounded-[8px] w-[134px]" />
      </div>
    </div>
  );
}
