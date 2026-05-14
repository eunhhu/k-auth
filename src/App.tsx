import {
  type CSSProperties,
  type PointerEvent,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import captureImage from "../asdf.png";
import "./App.css";

const tabs = ["주민등록", "운전면허", "스마트티켓", "동물등록증"];
const QR_MODULES = 29;
const QR_SECONDS = 30;
const QR_DURATION_MS = QR_SECONDS * 1000;
const QR_RESET_FILL_MS = 520;

function createQrSeed() {
  return Math.floor(Math.random() * 0xffffffff);
}

function getRandomModule(x: number, y: number, seed: number) {
  let hash = seed ^ (x * 374761393) ^ (y * 668265263);
  hash = (hash ^ (hash >>> 13)) * 1274126177;
  return ((hash ^ (hash >>> 16)) >>> 0) / 4294967296;
}

function getFinderModule(x: number, y: number) {
  const origins = [
    [0, 0],
    [QR_MODULES - 7, 0],
    [0, QR_MODULES - 7],
  ];

  for (const [originX, originY] of origins) {
    const localX = x - originX;
    const localY = y - originY;

    if (localX < 0 || localY < 0 || localX > 6 || localY > 6) {
      continue;
    }

    if (localX === 0 || localX === 6 || localY === 0 || localY === 6) {
      return true;
    }

    if (localX === 1 || localX === 5 || localY === 1 || localY === 5) {
      return false;
    }

    return true;
  }

  return null;
}

function QRCode({ seed }: { seed: number }) {
  const cells = useMemo(
    () =>
      Array.from({ length: QR_MODULES * QR_MODULES }, (_, index) => {
        const x = index % QR_MODULES;
        const y = Math.floor(index / QR_MODULES);
        const finderModule = getFinderModule(x, y);
        const isQuietSeparator =
          (x === 7 && (y < 8 || y > QR_MODULES - 9)) ||
          (y === 7 && (x < 8 || x > QR_MODULES - 9));
        const isTimingModule = (x === 6 || y === 6) && x > 7 && y > 7;
        const isOn =
          finderModule ??
          (!isQuietSeparator &&
            (isTimingModule
              ? (x + y) % 2 === 0
              : getRandomModule(x, y, seed) > 0.53));

        return isOn ? (
          <rect key={`${x}-${y}`} x={x} y={y} width="1" height="1" />
        ) : null;
      }),
    [seed],
  );

  return (
    <svg
      className="qr-code"
      viewBox={`0 0 ${QR_MODULES} ${QR_MODULES}`}
      aria-hidden="true"
    >
      {cells}
    </svg>
  );
}

function BackIcon() {
  return (
    <svg className="back-icon" viewBox="0 0 30 46" aria-hidden="true">
      <path d="M24 4 6 23l18 19" />
    </svg>
  );
}

function ScanIcon() {
  return (
    <svg className="top-icon" viewBox="0 0 42 42" aria-hidden="true">
      <path d="M6 15V8c0-1.1.9-2 2-2h7M27 6h7c1.1 0 2 .9 2 2v7M36 27v7c0 1.1-.9 2-2 2h-7M15 36H8c-1.1 0-2-.9-2-2v-7" />
      <path d="M16 21h10" />
    </svg>
  );
}

function GearIcon() {
  return (
    <svg className="top-icon gear-icon" viewBox="0 0 42 42" aria-hidden="true">
      <path d="M21 14.2a6.8 6.8 0 1 0 0 13.6 6.8 6.8 0 0 0 0-13.6Z" />
      <path d="m22.8 4.7 1.4 4.2c1 .3 1.9.7 2.8 1.2l4-2 3 5.2-3.5 2.8c.2 1 .2 2 .1 3l3.7 2.5-3 5.2-4.2-1.5c-.8.6-1.7 1.1-2.6 1.5l-.8 4.4h-6l-.8-4.4c-1-.4-1.8-.9-2.6-1.5l-4.2 1.5-3-5.2 3.7-2.5a14 14 0 0 1 .1-3L7.4 13.3l3-5.2 4 2c.9-.5 1.8-.9 2.8-1.2l1.4-4.2h4.2Z" />
    </svg>
  );
}

function App() {
  const [isDetailVisible, setIsDetailVisible] = useState(false);
  const [isPrivateInfoVisible, setIsPrivateInfoVisible] = useState(false);
  const [remainingMs, setRemainingMs] = useState(QR_DURATION_MS);
  const [isTimerResetting, setIsTimerResetting] = useState(false);
  const [qrSeed, setQrSeed] = useState(createQrSeed);
  const cycleStartRef = useRef(0);
  const resetEndRef = useRef(0);

  useEffect(() => {
    let animationFrameId = 0;

    const tick = (timestamp: number) => {
      if (!cycleStartRef.current) {
        cycleStartRef.current = timestamp;
      }

      if (resetEndRef.current) {
        if (timestamp < resetEndRef.current) {
          setRemainingMs(QR_DURATION_MS);
          animationFrameId = window.requestAnimationFrame(tick);
          return;
        }

        cycleStartRef.current = resetEndRef.current;
        resetEndRef.current = 0;
        setIsTimerResetting(false);
      }

      const elapsedMs = timestamp - cycleStartRef.current;

      if (elapsedMs >= QR_DURATION_MS) {
        setQrSeed(createQrSeed());
        setIsTimerResetting(true);
        setRemainingMs(QR_DURATION_MS);
        resetEndRef.current = timestamp + QR_RESET_FILL_MS;
      } else {
        setRemainingMs(QR_DURATION_MS - elapsedMs);
      }

      animationFrameId = window.requestAnimationFrame(tick);
    };

    animationFrameId = window.requestAnimationFrame(tick);

    return () => window.cancelAnimationFrame(animationFrameId);
  }, []);

  useEffect(() => {
    const preventDefault = (event: Event) => event.preventDefault();
    const preventMultiTouch = (event: TouchEvent) => {
      if (event.touches.length > 1) {
        event.preventDefault();
      }
    };

    document.addEventListener("gesturestart", preventDefault, { passive: false });
    document.addEventListener("gesturechange", preventDefault, { passive: false });
    document.addEventListener("gestureend", preventDefault, { passive: false });
    document.addEventListener("touchmove", preventMultiTouch, { passive: false });

    return () => {
      document.removeEventListener("gesturestart", preventDefault);
      document.removeEventListener("gesturechange", preventDefault);
      document.removeEventListener("gestureend", preventDefault);
      document.removeEventListener("touchmove", preventMultiTouch);
    };
  }, []);

  const handlePointerMove = (event: PointerEvent<HTMLElement>) => {
    const bounds = event.currentTarget.getBoundingClientRect();
    const x = (event.clientX - bounds.left) / bounds.width - 0.5;
    const y = (event.clientY - bounds.top) / bounds.height - 0.5;

    event.currentTarget.style.setProperty("--side-x", `${x * -12}px`);
    event.currentTarget.style.setProperty("--side-y", `${y * -8}px`);
    event.currentTarget.style.setProperty("--ad-x", `${x * 3}px`);
    event.currentTarget.style.setProperty("--art-x", `${x * 12}px`);
    event.currentTarget.style.setProperty("--art-y", `${y * 10}px`);
    event.currentTarget.style.setProperty("--globe-x", `${x * -18}px`);
    event.currentTarget.style.setProperty("--globe-y", `${y * -14}px`);
  };

  const handlePointerLeave = (event: PointerEvent<HTMLElement>) => {
    event.currentTarget.style.setProperty("--side-x", "0px");
    event.currentTarget.style.setProperty("--side-y", "0px");
    event.currentTarget.style.setProperty("--ad-x", "0px");
    event.currentTarget.style.setProperty("--art-x", "0px");
    event.currentTarget.style.setProperty("--art-y", "0px");
    event.currentTarget.style.setProperty("--globe-x", "0px");
    event.currentTarget.style.setProperty("--globe-y", "0px");
  };

  const remainingSeconds = Math.max(0, Math.ceil(remainingMs / 1000));
  const timerProgress = `${(remainingMs / QR_DURATION_MS) * 100}%`;

  return (
    <main className="identity-page">
      <section
        className="app-shell"
        aria-label="모바일신분증"
        onPointerLeave={handlePointerLeave}
        onPointerMove={handlePointerMove}
      >
        <header className="app-header">
          <button
            className="icon-button back-button"
            type="button"
            aria-label="뒤로가기"
          >
            <BackIcon />
          </button>
          <h1>모바일신분증</h1>
          <div className="header-actions" aria-hidden="true">
            <ScanIcon />
            <GearIcon />
          </div>
        </header>

        <nav className="tab-bar" aria-label="신분증 종류">
          {tabs.map((tab, index) => (
            <button
              className={`tab-item ${index === 0 ? "active" : ""}`}
              type="button"
              key={tab}
            >
              <span>{tab}</span>
              {index < 2 ? (
                <span className="confirm-badge">
                  확인
                  <br />
                  서비스
                </span>
              ) : null}
            </button>
          ))}
        </nav>

        <div className="content-area">
          <article className="side-card" aria-hidden="true" />

          <article
            className={`identity-card ${isDetailVisible ? "detail-mode" : "qr-mode"}`}
            aria-label="주민등록증 모바일 확인서비스"
          >
            <section className="card-art">
              <div className="banknote-globe" />
              <div className="warning-ribbon">
                3천만원 이하의 벌금) 주민등록증 이미지 위변조 및 부정 사용 금지
                (위반시
              </div>
              <div
                className="portrait"
                style={{ backgroundImage: `url(${captureImage})` }}
              />
              <div className="vertical-date">2026.05.15 01:24:02</div>

              <div className="detail-fields" aria-hidden={!isDetailVisible}>
                {!isPrivateInfoVisible ? (
                  <div className="masking-blur" aria-hidden="true" />
                ) : null}
                <p className="detail-service-label">
                  주민등록증 모바일 확인서비스
                </p>
                <p className="detail-name">문선우</p>
                <p className="resident-number">
                  {isPrivateInfoVisible ? "070407-3199515" : "070407-"}
                </p>
                <div className="address-lines">
                  <p>경기도 안산시 단원구</p>
                  {isPrivateInfoVisible ? <p>신촌1길 56 (초지동)</p> : null}
                </div>
                <button
                  className={`privacy-switch ${isPrivateInfoVisible ? "on" : ""}`}
                  type="button"
                  aria-label="상세 개인정보 표시"
                  aria-pressed={isPrivateInfoVisible}
                  onClick={() => setIsPrivateInfoVisible((visible) => !visible)}
                >
                  <span />
                </button>
                <div className="detail-legal-row">
                  <button className="detail-legal-link" type="button">
                    법적 효력 안내
                    <span aria-hidden="true" />
                  </button>
                  <p>2025.01.31.</p>
                </div>
              </div>
            </section>

            <section className="card-info" aria-hidden={isDetailVisible}>
              <p className="service-label">주민등록증 모바일 확인서비스</p>
              <p className="person-name">문선우</p>

              <div className="qr-panel">
                <QRCode seed={qrSeed} />
              </div>
              <div className="timer-block">
                <div
                  className={`time-bar ${isTimerResetting ? "resetting" : ""}`}
                  style={{ "--progress": timerProgress } as CSSProperties}
                >
                  <span />
                </div>
                <p>
                  남은시간 <strong>{remainingSeconds}초</strong>
                </p>
              </div>

              <button className="legal-link" type="button">
                법적 효력 안내
                <span aria-hidden="true" />
              </button>
            </section>

            <button
              className="detail-button"
              type="button"
              onClick={() => setIsDetailVisible((visible) => !visible)}
            >
              {isDetailVisible ? "QR정보 표시" : "상세정보 표시"}
            </button>
          </article>

          <button className="join-button" type="button">
            신분증결제 가입하기
          </button>

          <aside className="ad-banner" aria-label="네이버페이 포인트 광고">
            <div className="ad-icon">
              <span>pay</span>
            </div>
            <div className="ad-copy">
              <strong>메이플 키우기</strong>
              <p>AD · 손들어! 움직여도 보상 쏜다. 자동 사냥으로...</p>
            </div>
            <a href="/" onClick={(event) => event.preventDefault()}>
              다운로드
            </a>
            <span className="ad-info">i</span>
          </aside>
        </div>
      </section>
    </main>
  );
}

export default App;
