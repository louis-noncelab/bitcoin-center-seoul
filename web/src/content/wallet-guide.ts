import type { Locale } from "@/i18n/routing";

export const walletModels = ["SeedSigner", "Jade Plus", "Krux", "Keystone 3 Pro", "Coldcard Q", "Coconut Vault"] as const;
export type WalletModel = (typeof walletModels)[number];
export const guidePhases = ["phase1", "phase2", "phase3", "phase5", "phase6"] as const;
export type GuidePhase = (typeof guidePhases)[number];
export type PhoneOS = "android" | "ios";

// Preserved from the center’s bilingual in-person learning guide.
export const walletGuides: Readonly<Record<WalletModel, Readonly<Record<Locale, Readonly<Record<GuidePhase, readonly string[]>>>>>> = {
  "SeedSigner": {
    ko: {
      phase1: ["[SeedSigner] 메인 메뉴에서 Seeds를 선택하세요.","[SeedSigner] Enter 12-word seed를 선택하세요.","[SeedSigner] 테스트 니모닉 abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon about를 입력하세요."],
      phase2: ["[SeedSigner] Export Xpub를 선택하세요.","[SeedSigner] Single Sig를 선택하세요.","[SeedSigner] Native Segwit를 선택하세요.","[SeedSigner] BlueWallet를 선택하세요.","[Coconut Wallet] 보기 전용 지갑을 추가해 보세요!를 선택하세요.","[Coconut Wallet] SeedSigner를 선택하세요.","[Coconut Wallet] SeedSigner의 QR 코드를 스캔하세요."],
      phase3: ["[Coconut Wallet] 필요하다면 faucet에서 테스트 비트코인을 받으세요.","[Coconut Wallet] 아래 테스트 주소로 트랜잭션을 생성하세요."],
      phase5: ["[SeedSigner] Scan PSBT를 선택하세요.","[SeedSigner] Coconut Wallet의 QR 코드를 스캔하세요.","[SeedSigner] 트랜잭션에 서명하세요."],
      phase6: ["[Coconut Wallet] SeedSigner의 QR 코드를 스캔하세요.","[Coconut Wallet] 트랜잭션을 브로드캐스트하세요."],
    },
    en: {
      phase1: ["[SeedSigner] From the main menu, select Seeds.","[SeedSigner] Choose Enter 12-word seed.","[SeedSigner] Enter the test mnemonic abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon about."],
      phase2: ["[SeedSigner] Select Export Xpub.","[SeedSigner] Select Single Sig.","[SeedSigner] Select Native Segwit.","[SeedSigner] Choose BlueWallet.","[Coconut Wallet] Select Try adding a watch-only wallet!","[Coconut Wallet] Choose [SeedSigner].","[Coconut Wallet] Scan QR on the SeedSigner."],
      phase3: ["[Coconut Wallet] Get test Bitcoin from the faucet if you need.","[Coconut Wallet] Generate transaction with test address below."],
      phase5: ["[SeedSigner] Select Scan PSBT.","[SeedSigner] Scan QR on the Coconut Wallet.","[SeedSigner] Sign the transaction."],
      phase6: ["[Coconut Wallet] Scan the QR on the SeedSigner.","[Coconut Wallet] Broadcast the Transaction on the Coconut Wallet."],
    },
  },
  "Krux": {
    ko: {
      phase1: ["[Krux] Load Mnemonic를 선택하세요.","[Krux] Via Manual Input를 선택하세요.","[Krux] Words와 Yes를 선택하세요.","[Krux] 테스트 니모닉 abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon about를 입력하세요.","[Krux] Customize를 선택하고 Network를 선택하세요.","[Krux] Testnet를 선택하세요.","[Krux] Testnet, Single-sig, P2WPKH 및 m/84h/1h/0h를 확인하세요. 그렇지 않다면 Customize를 선택하여 조정하세요."],
      phase2: ["[Krux] 메인 메뉴로 돌아가서 Load Wallet를 선택하세요.","[Krux] Extended Public Key를 선택하세요.","[Krux] VPUB - QR Code를 선택하세요.","[Coconut Wallet] 보기 전용 지갑을 추가해 보세요!를 선택하세요.","[Coconut Wallet] [Krux]를 선택하세요.","[Coconut Wallet] Krux의 QR 코드를 스캔하세요."],
      phase3: ["[Coconut Wallet] 필요하다면 faucet에서 테스트 비트코인을 받으세요.","[Coconut Wallet] 아래 테스트 주소로 트랜잭션을 생성하세요."],
      phase5: ["[Krux] 메인 메뉴로 돌아가서 Sign과 PSBT를 선택하세요.","[Krux] Load from camera를 선택하세요.","[Krux] 트랜잭션에 서명하세요.","[Krux] Sign to QR code를 선택하세요."],
      phase6: ["[Coconut Wallet] Krux의 QR 코드를 스캔하세요.","[Coconut Wallet] 트랜잭션을 브로드캐스트하세요."],
    },
    en: {
      phase1: ["[Krux] Select Load Mnemonic.","[Krux] Select Via Manual Input.","[Krux] Select Words and Yes.","[Krux] Enter the test mnemonic abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon about","[Krux] Select Customize and select Network.","[Krux] Choose Testnet.","[Krux] Check Testnet, Single-sig, P2WPKH and m/84h/1h/0h. If not, adjust it through selecting Customize."],
      phase2: ["[Krux] Back to the main menu, select Load Wallet.","[Krux] Select Extended Public Key.","[Krux] Select VPUB - QR Code.","[Coconut Wallet] Select Try adding a watch-only wallet!","[Coconut Wallet] Choose [Krux].","[Coconut Wallet] Scan QR on the Krux."],
      phase3: ["[Coconut Wallet] Get test Bitcoin from the faucet if you need.","[Coconut Wallet] Generate transaction with test address below."],
      phase5: ["[Krux] Back to the main menu, select Sign and PSBT.","[Krux] Select Load from camera.","[Krux] Sign the transaction.","[Krux] Select Sign to QR code."],
      phase6: ["[Coconut Wallet] Scan the QR on the Krux.","[Coconut Wallet] Broadcast the Transaction on the Coconut Wallet."],
    },
  },
  "Jade Plus": {
    ko: {
      phase1: ["[Jade] Options를 선택하세요.","[Jade] Temporary Signer를 선택하세요.","[Jade] 12 Words를 선택하세요.","[Jade] 니모닉 abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon about를 입력하세요.","[Jade] No를 선택하세요.","[Jade] QR를 선택하세요.","[Jade] 메인 메뉴에서 Options를 선택하세요.","[Jade] Device를 선택하세요.","[Jade] Settings를 선택하세요.","[Jade] Network: Mainnet를 선택하세요.","[Jade] Testnet를 선택하세요."],
      phase2: ["[Jade] 메인 메뉴로 돌아가서 Options를 선택하세요.","[Jade] Wallet를 선택하세요.","[Jade] Export Xpub를 선택하세요.","[Coconut Wallet] 보기 전용 지갑을 추가해 보세요!를 선택하세요.","[Coconut Wallet] Jade를 선택하세요.","[Coconut Wallet] Jade의 QR 코드를 스캔하세요."],
      phase3: ["[Coconut Wallet] 필요하다면 faucet에서 테스트 비트코인을 받으세요.","[Coconut Wallet] 아래 테스트 주소로 트랜잭션을 생성하세요."],
      phase5: ["[Jade] Coconut Wallet에서 Scan QR를 선택하세요.","[Jade] 트랜잭션에 서명하세요."],
      phase6: ["[Coconut Wallet] Jade의 QR 코드를 스캔하세요.","[Coconut Wallet] 트랜잭션을 브로드캐스트하세요."],
    },
    en: {
      phase1: ["[Jade] Select Options.","[Jade] Select Temporary Signer.","[Jade] Select 12 Words.","[Jade] Enter the mnemonic abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon about.","[Jade] Select No.","[Jade] Select QR.","[Jade] From the main menu, select Options.","[Jade] Select Device.","[Jade] Select Settings.","[Jade] Choose Network: Mainnet.","[Jade] Choose Testnet."],
      phase2: ["[Jade] Back to the main menu, select Options.","[Jade] Select Wallet","[Jade] Select Export Xpub.","[Coconut Wallet] Select Try adding a watch-only wallet!","[Coconut Wallet] Choose [Jade].","[Coconut Wallet] Select Scan QR on the Jade."],
      phase3: ["[Coconut Wallet] Get test Bitcoin from the faucet if you need.","[Coconut Wallet] Generate transaction with test address below."],
      phase5: ["[Jade] Select Scan QR on the Coconut Wallet.","[Jade] Sign the transaction."],
      phase6: ["[Coconut Wallet] Scan the QR on the Jade.","[Coconut Wallet] Broadcast the Transaction on the Coconut Wallet."],
    },
  },
  "Keystone 3 Pro": {
    ko: {
      phase1: ["[Keystone] 지갑 비밀번호는 090103입니다.","[Keystone] 기기에 이미 니모닉이 등록되어 있습니다."],
      phase2: ["[Keystone] 더보기 아이콘를 선택하세요.","[Keystone] Connect Software Wallet를 선택하세요.","[Keystone] Sparrow를 선택하세요.","[Coconut Wallet] 보기 전용 지갑을 추가해 보세요!를 선택하세요.","[Coconut Wallet] [Keystone 3 Pro]를 선택하세요.","[Coconut Wallet] Keystone의 QR 코드를 스캔하세요."],
      phase3: ["[Coconut Wallet] 필요하다면 faucet에서 테스트 비트코인을 받으세요.","[Coconut Wallet] 아래 테스트 주소로 트랜잭션을 생성하세요."],
      phase5: ["[Keystone] SCAN를 선택하고 Coconut Wallet의 QR 코드를 스캔하세요.","[Keystone] 트랜잭션에 서명하세요."],
      phase6: ["[Coconut Wallet] Keystone의 QR 코드를 스캔하세요.","[Coconut Wallet] 트랜잭션을 브로드캐스트하세요."],
    },
    en: {
      phase1: ["[Keystone] The wallet password is 090103.","[Keystone] A mnemonic has already been registered on the device."],
      phase2: ["[Keystone] Select the more options icon.","[Keystone] Select Connect Software Wallet.","[Keystone] Choose Sparrow.","[Coconut Wallet] Select Try adding a watch-only wallet!","[Coconut Wallet] Choose [Keystone 3 Pro].","[Coconut Wallet] Scan QR on the Keystone."],
      phase3: ["[Coconut Wallet] Get test Bitcoin from the faucet if you need.","[Coconut Wallet] Generate transaction with test address below."],
      phase5: ["[Keystone] Select SCAN and scan QR on the Coconut Wallet.","[Keystone] Sign the transaction."],
      phase6: ["[Coconut Wallet] Scan QR on the Keystone.","[Coconut Wallet] Broadcast the Transaction on the Coconut Wallet."],
    },
  },
  "Coldcard Q": {
    ko: {
      phase1: ["[Coldcard] 전원 버튼을 길게 누르세요.","[Coldcard] PIN은 090103이고 ENTER를 누르세요.","[Coldcard] hen comic를 확인하세요.","[Coldcard] 두 번째 PIN도 090103이고 ENTER를 누르세요.","[Coldcard] 기기에 이미 니모닉이 등록되어 있습니다."],
      phase2: ["[Coldcard] Advanced/Tools를 선택하고 ENTER를 누르세요.","[Coldcard] Export Wallet를 선택하고 ENTER를 누르세요.","[Coldcard] Sparrow Wallet를 선택하고 ENTER를 누르세요.","[Coldcard] ENTER를 누르고 QR 버튼을 누르세요.","[Coconut Wallet] 보기 전용 지갑을 추가해 보세요!를 선택하세요.","[Coconut Wallet] [Coldcard]를 선택하세요.","[Coconut Wallet] Coldcard의 QR 코드를 스캔하세요."],
      phase3: ["[Coconut Wallet] 필요하다면 faucet에서 테스트 비트코인을 받으세요.","[Coconut Wallet] 아래 테스트 주소로 트랜잭션을 생성하세요."],
      phase5: ["[Coldcard] 메인 메뉴로 돌아가세요 (CANCEL을 누르세요), Ready to Sign를 선택하고 ENTER를 누르세요.","[Coldcard] QR 버튼을 누르세요.","[Coldcard] Coconut Wallet의 QR 코드를 스캔하세요. (카메라는 상단에 있습니다.)","[Coldcard] OK TO SEND?를 선택하고 ENTER를 누르세요."],
      phase6: ["[Coconut Wallet] Coldcard의 QR 코드를 스캔하세요.","[Coconut Wallet] 트랜잭션을 브로드캐스트하세요."],
    },
    en: {
      phase1: ["[Coldcard] Press and hold the power button.","[Coldcard] Pin is 090103 and press ENTER.","[Coldcard] Check hen comic.","[Coldcard] Second Pin is also 090103 and press ENTER.","[Coldcard] A mnemonic has already been registered on the device."],
      phase2: ["[Coldcard] Select Advanced/Tools and press ENTER.","[Coldcard] Select Export Wallet and press ENTER.","[Coldcard] Choose Sparrow Wallet and press ENTER.","[Coldcard] Press ENTER and press QR button.","[Coconut Wallet] Select Try adding a watch-only wallet!","[Coconut Wallet] Choose [Coldcard].","[Coconut Wallet] Scan QR on the Coldcard."],
      phase3: ["[Coconut Wallet] Get test Bitcoin from the faucet if you need.","[Coconut Wallet] Generate transaction with test address below."],
      phase5: ["[Coldcard] Back to the main menu (Press CANCEL), select Ready to Sign and press ENTER.","[Coldcard] Press QR button.","[Coldcard] Scan QR on the Coconut Wallet. (The camera is on the top.)","[Coldcard] Select OK TO SEND? and press ENTER."],
      phase6: ["[Coconut Wallet] Scan QR on the Coldcard.","[Coconut Wallet] Broadcast the Transaction on the Coconut Wallet."],
    },
  },
  "Coconut Vault": {
    ko: {
      phase1: ["[Coconut Vault] iPhone의 패스코드는 090103입니다.","[Coconut Vault] Coconut Vault의 PIN은 090103입니다.","[Coconut Vault] 기기에 이미 니모닉이 등록되어 있습니다."],
      phase2: ["[Coconut Vault] Export to Watch-only Wallet를 선택하고 Coconut를 선택하세요.","[Coconut Wallet] 보기 전용 지갑을 추가해 보세요!를 선택하세요.","[Coconut Wallet] [Coconut Vault]를 선택하세요.","[Coconut Wallet] Coconut Vault의 QR 코드를 스캔하세요."],
      phase3: ["[Coconut Wallet] 필요하다면 faucet에서 테스트 비트코인을 받으세요.","[Coconut Wallet] 아래 테스트 주소로 트랜잭션을 생성하세요."],
      phase5: ["[Coconut Vault] Sign를 선택하세요.","[Coconut Vault] Coconut Wallet의 QR 코드를 스캔하세요.","[Coconut Vault] 트랜잭션에 서명하세요."],
      phase6: ["[Coconut Wallet] Coconut Vault의 QR 코드를 스캔하세요.","[Coconut Wallet] 트랜잭션을 브로드캐스트하세요."],
    },
    en: {
      phase1: ["[Coconut Vault] The iPhone's passcode is 090103.","[Coconut Vault] Pin of Coconut Vault is 090103.","[Coconut Vault] A mnemonic has already been registered on the device."],
      phase2: ["[Coconut Vault] Choose Export to Watch-only Wallet and select Coconut.","[Coconut Wallet] Select Try adding a watch-only wallet!","[Coconut Wallet] Choose [Coconut Vault].","[Coconut Wallet] Scan QR on the Coconut Vault."],
      phase3: ["[Coconut Wallet] Get test Bitcoin from the faucet if you need.","[Coconut Wallet] Generate transaction with test address below."],
      phase5: ["[Coconut Vault] Select Sign.","[Coconut Vault] Scan QR on the Coconut Wallet.","[Coconut Vault] Sign the transaction."],
      phase6: ["[Coconut Wallet] Scan QR on the Coconut Vault.","[Coconut Wallet] Broadcast the Transaction on the Coconut Wallet."],
    },
  },
};

export const walletCopy = {
  "ko": {
    "welcome": {
      "title": "하드월렛 체험하기",
      "message1": "비트코인 센터 서울의 하드월렛 체험존에 오신 것을 환영합니다.",
      "message2": "코코넛 월렛을 통해 마음껏 테스트 비트코인을 주고 받아보세요.",
      "message3": "하드월렛은 고장나지 않게 조심히 다뤄주세요.",
      "button": "시작해볼까요?"
    },
    "phoneSelection": {
      "title": "휴대폰 OS 선택",
      "message": "현재 사용하고 있는 휴대폰의 OS를 선택해주세요",
      "android": "안드로이드",
      "ios": "아이폰"
    },
    "download": {
      "title": "다운로드",
      "android": "아래 QR을 통해 플레이스토어에서 '코코넛 월렛 학습용'을 다운받으세요.",
      "ios": "아래 QR을 통해 앱스토어에서 '코코넛 월렛 학습용'을 다운받으세요.",
      "button": "다운로드를 완료했습니다."
    },
    "walletSelection": {
      "title": "하드월렛 선택",
      "message": "체험할 하드월렛 기종을 고르세요."
    },
    "phases": {
      "phase1": "Phase 1. 니모닉 생성 단계",
      "phase2": "Phase 2. 보기전용 지갑 연동 단계",
      "phase3": "Phase 3. 트랜잭션 생성 단계",
      "phase5": "Phase 5. 트랜잭션에 서명 단계",
      "phase6": "Phase 6. 비트코인 전송 단계"
    },
    "final": {
      "question": "비트코인 송금에 성공했나요?",
      "yes": "네",
      "no": "아니오",
      "retryMessage": "스텝의 도움을 받아서 다시 시도해보세요.",
      "congratulations": "축하합니다."
    },
    "next": "다음",
    "prev": "이전",
    "restart": "다시 시작",
    "exit": "나가기"
  },
  "en": {
    "welcome": {
      "title": "Hardware Wallet Experience",
      "message1": "Welcome to the Hardware Wallet Experience Zone at Bitcoin Center Seoul.",
      "message2": "Try sending and receiving test Bitcoin freely through Coconut Wallet Learning Edition.",
      "message3": "Please handle the hardware wallet carefully to avoid damage.",
      "button": "Let's Get Started"
    },
    "phoneSelection": {
      "title": "Select Phone OS",
      "message": "Please select the OS of your current phone",
      "android": "Android",
      "ios": "iPhone"
    },
    "download": {
      "title": "Download",
      "android": "Download 'Coconut Wallet Learning Edition' from the Play Store via the QR code below.",
      "ios": "Download 'Coconut Wallet Learning Edition' from the App Store via the QR code below.",
      "button": "I've completed the download"
    },
    "walletSelection": {
      "title": "Select Hardware Wallet",
      "message": "Choose the hardware wallet model you want to experience."
    },
    "phases": {
      "phase1": "Phase 1. Mnemonic Generation",
      "phase2": "Phase 2. Watch-only Wallet Connection",
      "phase3": "Phase 3. Transaction Creation",
      "phase5": "Phase 5. Transaction Signing",
      "phase6": "Phase 6. Bitcoin Transfer"
    },
    "final": {
      "question": "Did you successfully send Bitcoin?",
      "yes": "Yes",
      "no": "No",
      "retryMessage": "Please try again with the help of the steps.",
      "congratulations": "Congratulations!"
    },
    "next": "Next",
    "prev": "Previous",
    "restart": "Restart",
    "exit": "Exit"
  }
} as const;
