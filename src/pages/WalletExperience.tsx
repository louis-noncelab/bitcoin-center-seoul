import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useLanguage } from '@/contexts/LanguageContext';
import { Button } from '@/components/ui/button';
import { Home } from 'lucide-react';

type PhoneOS = 'android' | 'ios' | null;
type WalletType = 'SeedSigner' | 'Jade Plus' | 'Krux' | 'Keystone 3 Pro' | 'Coldcard Q' | 'Coconut Vault' | null;

const WalletExperience = () => {
  const navigate = useNavigate();
  const { language, toggleLanguage } = useLanguage();
  const [step, setStep] = useState(1);
  const [phoneOS, setPhoneOS] = useState<PhoneOS>(null);
  const [walletType, setWalletType] = useState<WalletType>(null);
  const [currentPhase, setCurrentPhase] = useState(1);

  const content = {
    ko: {
      welcome: {
        title: '하드월렛 체험하기',
        message1: '안녕하세요. 비트코인센터서울의 하드월렛 체험존에 오신 것을 환영합니다.',
        message2: '코코넛 월렛 학습용을 통해 마음껏 테스트 비트코인을 주고 받아보세요.',
        message3: '하드월렛은 고장나지 않게 조심히 다뤄주세요',
        button: '시작해볼까요?'
      },
      phoneSelection: {
        title: '휴대폰 OS 선택',
        message: '현재 사용하고 있는 휴대폰의 OS를 선택해주세요',
        android: '안드로이드',
        ios: '아이폰'
      },
      download: {
        title: '다운로드',
        android: '아래 QR을 통해 플레이스토어에서 \'코코넛 월렛 학습용\'을 다운받으세요.',
        ios: '아래 QR을 통해 앱스토어에서 \'코코넛 월렛 학습용\'을 다운받으세요.',
        button: '다운로드를 완료했습니다.'
      },
      walletSelection: {
        title: '하드월렛 선택',
        message: '체험할 하드월렛 기종을 고르세요'
      },
      phases: {
        phase1: 'Phase 1. 니모닉 생성 단계',
        phase2: 'Phase 2. 보기전용 지갑 연동 단계',
        phase3: 'Phase 3. 트랜잭션 생성 단계',
        phase5: 'Phase 5. 트랜잭션에 서명 단계',
        phase6: 'Phase 6. 비트코인 전송 단계'
      },
      final: {
        question: '비트코인 송금에 성공했나요?',
        yes: '네',
        no: '아니오',
        retryMessage: '스텝의 도움을 받아서 다시 시도해보세요',
        congratulations: '축하합니다.'
      },
      next: '다음',
      prev: '이전',
      home: '처음으로'
    },
    en: {
      welcome: {
        title: 'Hardware Wallet Experience',
        message1: 'Welcome to the Hardware Wallet Experience Zone at Bitcoin Center Seoul.',
        message2: 'Try sending and receiving test Bitcoin freely through Coconut Wallet Learning Edition.',
        message3: 'Please handle the hardware wallet carefully to avoid damage.',
        button: 'Let\'s Get Started'
      },
      phoneSelection: {
        title: 'Select Phone OS',
        message: 'Please select the OS of your current phone',
        android: 'Android',
        ios: 'iPhone'
      },
      download: {
        title: 'Download',
        android: 'Download \'Coconut Wallet Learning Edition\' from the Play Store via the QR code below.',
        ios: 'Download \'Coconut Wallet Learning Edition\' from the App Store via the QR code below.',
        button: 'I\'ve completed the download'
      },
      walletSelection: {
        title: 'Select Hardware Wallet',
        message: 'Choose the hardware wallet model you want to experience'
      },
      phases: {
        phase1: 'Phase 1. Mnemonic Generation',
        phase2: 'Phase 2. Watch-only Wallet Connection',
        phase3: 'Phase 3. Transaction Creation',
        phase5: 'Phase 5. Transaction Signing',
        phase6: 'Phase 6. Bitcoin Transfer'
      },
      final: {
        question: 'Did you successfully send Bitcoin?',
        yes: 'Yes',
        no: 'No',
        retryMessage: 'Please try again with the help of the steps',
        congratulations: 'Congratulations!'
      },
      next: 'Next',
      prev: 'Previous',
      home: 'Home'
    }
  };

  // 하드월렛별 가이드 데이터
  const walletGuides: Record<string, any> = {
    'SeedSigner': {
      ko: {
        phase1: [
          '[SeedSigner] 메인 메뉴에서 Seeds를 선택하세요.',
          '[SeedSigner] Enter 12-word seed를 선택하세요.',
          '[SeedSigner] 테스트 니모닉 abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon about를 입력하세요.'
        ],
        phase2: [
          '[SeedSigner] Export Xpub를 선택하세요.',
          '[SeedSigner] Single Sig를 선택하세요.',
          '[SeedSigner] Native Segwit를 선택하세요.',
          '[SeedSigner] BlueWallet를 선택하세요.',
          '[Coconut Wallet] 보기 전용 지갑을 추가해 보세요!를 선택하세요.',
          '[Coconut Wallet] SeedSigner를 선택하세요.',
          '[Coconut Wallet] SeedSigner의 QR 코드를 스캔하세요.'
        ],
        phase3: [
          '[Coconut Wallet] 필요하다면 faucet에서 테스트 비트코인을 받으세요.',
          '[Coconut Wallet] 아래 테스트 주소로 트랜잭션을 생성하세요.'
        ],
        phase5: [
          '[SeedSigner] Scan PSBT를 선택하세요.',
          '[SeedSigner] Coconut Wallet의 QR 코드를 스캔하세요.',
          '[SeedSigner] 트랜잭션에 서명하세요.'
        ],
        phase6: [
          '[Coconut Wallet] SeedSigner의 QR 코드를 스캔하세요.',
          '[Coconut Wallet] 트랜잭션을 브로드캐스트하세요.'
        ]
      },
      en: {
        phase1: [
          '[SeedSigner] From the main menu, select Seeds.',
          '[SeedSigner] Choose Enter 12-word seed.',
          '[SeedSigner] Enter the test mnemonic abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon about.'
        ],
        phase2: [
          '[SeedSigner] Select Export Xpub.',
          '[SeedSigner] Select Single Sig.',
          '[SeedSigner] Select Native Segwit.',
          '[SeedSigner] Choose BlueWallet.',
          '[Coconut Wallet] Select Try adding a watch-only wallet!',
          '[Coconut Wallet] Choose [SeedSigner].',
          '[Coconut Wallet] Scan QR on the SeedSigner.'
        ],
        phase3: [
          '[Coconut Wallet] Get test Bitcoin from the faucet if you need.',
          '[Coconut Wallet] Generate transaction with test address below.'
        ],
        phase5: [
          '[SeedSigner] Select Scan PSBT.',
          '[SeedSigner] Scan QR on the Coconut Wallet.',
          '[SeedSigner] Sign the transaction.'
        ],
        phase6: [
          '[Coconut Wallet] Scan the QR on the SeedSigner.',
          '[Coconut Wallet] Broadcast the Transaction on the Coconut Wallet.'
        ]
      }
    },
    'Krux': {
      ko: {
        phase1: [
          '[Krux] Load Mnemonic를 선택하세요.',
          '[Krux] Via Manual Input를 선택하세요.',
          '[Krux] Words와 Yes를 선택하세요.',
          '[Krux] 테스트 니모닉 abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon about를 입력하세요.',
          '[Krux] Customize를 선택하고 Network를 선택하세요.',
          '[Krux] Testnet를 선택하세요.',
          '[Krux] Testnet, Single-sig, P2WPKH 및 m/84h/1h/0h를 확인하세요. 그렇지 않다면 Customize를 선택하여 조정하세요.'
        ],
        phase2: [
          '[Krux] 메인 메뉴로 돌아가서 Load Wallet를 선택하세요.',
          '[Krux] Extended Public Key를 선택하세요.',
          '[Krux] VPUB - QR Code를 선택하세요.',
          '[Coconut Wallet] 보기 전용 지갑을 추가해 보세요!를 선택하세요.',
          '[Coconut Wallet] [Krux]를 선택하세요.',
          '[Coconut Wallet] Krux의 QR 코드를 스캔하세요.'
        ],
        phase3: [
          '[Coconut Wallet] 필요하다면 faucet에서 테스트 비트코인을 받으세요.',
          '[Coconut Wallet] 아래 테스트 주소로 트랜잭션을 생성하세요.'
        ],
        phase5: [
          '[Krux] 메인 메뉴로 돌아가서 Sign과 PSBT를 선택하세요.',
          '[Krux] Load from camera를 선택하세요.',
          '[Krux] 트랜잭션에 서명하세요.',
          '[Krux] Sign to QR code를 선택하세요.'
        ],
        phase6: [
          '[Coconut Wallet] Krux의 QR 코드를 스캔하세요.',
          '[Coconut Wallet] 트랜잭션을 브로드캐스트하세요.'
        ]
      },
      en: {
        phase1: [
          '[Krux] Select Load Mnemonic.',
          '[Krux] Select Via Manual Input.',
          '[Krux] Select Words and Yes.',
          '[Krux] Enter the test mnemonic abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon about',
          '[Krux] Select Customize and select Network.',
          '[Krux] Choose Testnet.',
          '[Krux] Check Testnet, Single-sig, P2WPKH and m/84h/1h/0h. If not, adjust it through selecting Customize.'
        ],
        phase2: [
          '[Krux] Back to the main menu, select Load Wallet.',
          '[Krux] Select Extended Public Key.',
          '[Krux] Select VPUB - QR Code.',
          '[Coconut Wallet] Select Try adding a watch-only wallet!',
          '[Coconut Wallet] Choose [Krux].',
          '[Coconut Wallet] Scan QR on the Krux.'
        ],
        phase3: [
          '[Coconut Wallet] Get test Bitcoin from the faucet if you need.',
          '[Coconut Wallet] Generate transaction with test address below.'
        ],
        phase5: [
          '[Krux] Back to the main menu, select Sign and PSBT.',
          '[Krux] Select Load from camera.',
          '[Krux] Sign the transaction.',
          '[Krux] Select Sign to QR code.'
        ],
        phase6: [
          '[Coconut Wallet] Scan the QR on the Krux.',
          '[Coconut Wallet] Broadcast the Transaction on the Coconut Wallet.'
        ]
      }
    },
    'Jade Plus': {
      ko: {
        phase1: [
          '[Jade] Options를 선택하세요.',
          '[Jade] Temporary Signer를 선택하세요.',
          '[Jade] 12 Words를 선택하세요.',
          '[Jade] 니모닉 abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon about를 입력하세요.',
          '[Jade] No를 선택하세요.',
          '[Jade] QR를 선택하세요.',
          '[Jade] 메인 메뉴에서 Options를 선택하세요.',
          '[Jade] Device를 선택하세요.',
          '[Jade] Settings를 선택하세요.',
          '[Jade] Network: Mainnet를 선택하세요.',
          '[Jade] Testnet를 선택하세요.'
        ],
        phase2: [
          '[Jade] 메인 메뉴로 돌아가서 Options를 선택하세요.',
          '[Jade] Wallet를 선택하세요.',
          '[Jade] Export Xpub를 선택하세요.',
          '[Coconut Wallet] 보기 전용 지갑을 추가해 보세요!를 선택하세요.',
          '[Coconut Wallet] Jade를 선택하세요.',
          '[Coconut Wallet] Jade의 QR 코드를 스캔하세요.'
        ],
        phase3: [
          '[Coconut Wallet] 필요하다면 faucet에서 테스트 비트코인을 받으세요.',
          '[Coconut Wallet] 아래 테스트 주소로 트랜잭션을 생성하세요.'
        ],
        phase5: [
          '[Jade] Coconut Wallet에서 Scan QR를 선택하세요.',
          '[Jade] 트랜잭션에 서명하세요.'
        ],
        phase6: [
          '[Coconut Wallet] Jade의 QR 코드를 스캔하세요.',
          '[Coconut Wallet] 트랜잭션을 브로드캐스트하세요.'
        ]
      },
      en: {
        phase1: [
          '[Jade] Select Options.',
          '[Jade] Select Temporary Signer.',
          '[Jade] Select 12 Words.',
          '[Jade] Enter the mnemonic abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon about.',
          '[Jade] Select No.',
          '[Jade] Select QR.',
          '[Jade] From the main menu, select Options.',
          '[Jade] Select Device.',
          '[Jade] Select Settings.',
          '[Jade] Choose Network: Mainnet.',
          '[Jade] Choose Testnet.'
        ],
        phase2: [
          '[Jade] Back to the main menu, select Options.',
          '[Jade] Select Wallet',
          '[Jade] Select Export Xpub.',
          '[Coconut Wallet] Select Try adding a watch-only wallet!',
          '[Coconut Wallet] Choose [Jade].',
          '[Coconut Wallet] Select Scan QR on the Jade.'
        ],
        phase3: [
          '[Coconut Wallet] Get test Bitcoin from the faucet if you need.',
          '[Coconut Wallet] Generate transaction with test address below.'
        ],
        phase5: [
          '[Jade] Select Scan QR on the Coconut Wallet.',
          '[Jade] Sign the transaction.'
        ],
        phase6: [
          '[Coconut Wallet] Scan the QR on the Jade.',
          '[Coconut Wallet] Broadcast the Transaction on the Coconut Wallet.'
        ]
      }
    },
    'Keystone 3 Pro': {
      ko: {
        phase1: [
          '[Keystone] 지갑 비밀번호는 090103입니다.',
          '[Keystone] 기기에 이미 니모닉이 등록되어 있습니다.'
        ],
        phase2: [
          '[Keystone] 더보기 아이콘를 선택하세요.',
          '[Keystone] Connect Software Wallet를 선택하세요.',
          '[Keystone] Sparrow를 선택하세요.',
          '[Coconut Wallet] 보기 전용 지갑을 추가해 보세요!를 선택하세요.',
          '[Coconut Wallet] [Keystone 3 Pro]를 선택하세요.',
          '[Coconut Wallet] Keystone의 QR 코드를 스캔하세요.'
        ],
        phase3: [
          '[Coconut Wallet] 필요하다면 faucet에서 테스트 비트코인을 받으세요.',
          '[Coconut Wallet] 아래 테스트 주소로 트랜잭션을 생성하세요.'
        ],
        phase5: [
          '[Keystone] SCAN를 선택하고 Coconut Wallet의 QR 코드를 스캔하세요.',
          '[Keystone] 트랜잭션에 서명하세요.'
        ],
        phase6: [
          '[Coconut Wallet] Keystone의 QR 코드를 스캔하세요.',
          '[Coconut Wallet] 트랜잭션을 브로드캐스트하세요.'
        ]
      },
      en: {
        phase1: [
          '[Keystone] The wallet password is 090103.',
          '[Keystone] A mnemonic has already been registered on the device.'
        ],
        phase2: [
          '[Keystone] Select the more options icon.',
          '[Keystone] Select Connect Software Wallet.',
          '[Keystone] Choose Sparrow.',
          '[Coconut Wallet] Select Try adding a watch-only wallet!',
          '[Coconut Wallet] Choose [Keystone 3 Pro].',
          '[Coconut Wallet] Scan QR on the Keystone.'
        ],
        phase3: [
          '[Coconut Wallet] Get test Bitcoin from the faucet if you need.',
          '[Coconut Wallet] Generate transaction with test address below.'
        ],
        phase5: [
          '[Keystone] Select SCAN and scan QR on the Coconut Wallet.',
          '[Keystone] Sign the transaction.'
        ],
        phase6: [
          '[Coconut Wallet] Scan QR on the Keystone.',
          '[Coconut Wallet] Broadcast the Transaction on the Coconut Wallet.'
        ]
      }
    },
    'Coldcard Q': {
      ko: {
        phase1: [
          '[Coldcard] 전원 버튼을 길게 누르세요.',
          '[Coldcard] PIN은 090103이고 ENTER를 누르세요.',
          '[Coldcard] hen comic를 확인하세요.',
          '[Coldcard] 두 번째 PIN도 090103이고 ENTER를 누르세요.',
          '[Coldcard] 기기에 이미 니모닉이 등록되어 있습니다.'
        ],
        phase2: [
          '[Coldcard] Advanced/Tools를 선택하고 ENTER를 누르세요.',
          '[Coldcard] Export Wallet를 선택하고 ENTER를 누르세요.',
          '[Coldcard] Sparrow Wallet를 선택하고 ENTER를 누르세요.',
          '[Coldcard] ENTER를 누르고 QR 버튼을 누르세요.',
          '[Coconut Wallet] 보기 전용 지갑을 추가해 보세요!를 선택하세요.',
          '[Coconut Wallet] [Coldcard]를 선택하세요.',
          '[Coconut Wallet] Coldcard의 QR 코드를 스캔하세요.'
        ],
        phase3: [
          '[Coconut Wallet] 필요하다면 faucet에서 테스트 비트코인을 받으세요.',
          '[Coconut Wallet] 아래 테스트 주소로 트랜잭션을 생성하세요.'
        ],
        phase5: [
          '[Coldcard] 메인 메뉴로 돌아가세요 (CANCEL을 누르세요), Ready to Sign를 선택하고 ENTER를 누르세요.',
          '[Coldcard] QR 버튼을 누르세요.',
          '[Coldcard] Coconut Wallet의 QR 코드를 스캔하세요. (카메라는 상단에 있습니다.)',
          '[Coldcard] OK TO SEND?를 선택하고 ENTER를 누르세요.'
        ],
        phase6: [
          '[Coconut Wallet] Coldcard의 QR 코드를 스캔하세요.',
          '[Coconut Wallet] 트랜잭션을 브로드캐스트하세요.'
        ]
      },
      en: {
        phase1: [
          '[Coldcard] Press and hold the power button.',
          '[Coldcard] Pin is 090103 and press ENTER.',
          '[Coldcard] Check hen comic.',
          '[Coldcard] Second Pin is also 090103 and press ENTER.',
          '[Coldcard] A mnemonic has already been registered on the device.'
        ],
        phase2: [
          '[Coldcard] Select Advanced/Tools and press ENTER.',
          '[Coldcard] Select Export Wallet and press ENTER.',
          '[Coldcard] Choose Sparrow Wallet and press ENTER.',
          '[Coldcard] Press ENTER and press QR button.',
          '[Coconut Wallet] Select Try adding a watch-only wallet!',
          '[Coconut Wallet] Choose [Coldcard].',
          '[Coconut Wallet] Scan QR on the Coldcard.'
        ],
        phase3: [
          '[Coconut Wallet] Get test Bitcoin from the faucet if you need.',
          '[Coconut Wallet] Generate transaction with test address below.'
        ],
        phase5: [
          '[Coldcard] Back to the main menu (Press CANCEL), select Ready to Sign and press ENTER.',
          '[Coldcard] Press QR button.',
          '[Coldcard] Scan QR on the Coconut Wallet. (The camera is on the top.)',
          '[Coldcard] Select OK TO SEND? and press ENTER.'
        ],
        phase6: [
          '[Coconut Wallet] Scan QR on the Coldcard.',
          '[Coconut Wallet] Broadcast the Transaction on the Coconut Wallet.'
        ]
      }
    },
    'Coconut Vault': {
      ko: {
        phase1: [
          '[Coconut Vault] iPhone의 패스코드는 090103입니다.',
          '[Coconut Vault] Coconut Vault의 PIN은 090103입니다.',
          '[Coconut Vault] 기기에 이미 니모닉이 등록되어 있습니다.'
        ],
        phase2: [
          '[Coconut Vault] Export to Watch-only Wallet를 선택하고 Coconut를 선택하세요.',
          '[Coconut Wallet] 보기 전용 지갑을 추가해 보세요!를 선택하세요.',
          '[Coconut Wallet] [Coconut Vault]를 선택하세요.',
          '[Coconut Wallet] Coconut Vault의 QR 코드를 스캔하세요.'
        ],
        phase3: [
          '[Coconut Wallet] 필요하다면 faucet에서 테스트 비트코인을 받으세요.',
          '[Coconut Wallet] 아래 테스트 주소로 트랜잭션을 생성하세요.'
        ],
        phase5: [
          '[Coconut Vault] Sign를 선택하세요.',
          '[Coconut Vault] Coconut Wallet의 QR 코드를 스캔하세요.',
          '[Coconut Vault] 트랜잭션에 서명하세요.'
        ],
        phase6: [
          '[Coconut Wallet] Coconut Vault의 QR 코드를 스캔하세요.',
          '[Coconut Wallet] 트랜잭션을 브로드캐스트하세요.'
        ]
      },
      en: {
        phase1: [
          '[Coconut Vault] The iPhone\'s passcode is 090103.',
          '[Coconut Vault] Pin of Coconut Vault is 090103.',
          '[Coconut Vault] A mnemonic has already been registered on the device.'
        ],
        phase2: [
          '[Coconut Vault] Choose Export to Watch-only Wallet and select Coconut.',
          '[Coconut Wallet] Select Try adding a watch-only wallet!',
          '[Coconut Wallet] Choose [Coconut Vault].',
          '[Coconut Wallet] Scan QR on the Coconut Vault.'
        ],
        phase3: [
          '[Coconut Wallet] Get test Bitcoin from the faucet if you need.',
          '[Coconut Wallet] Generate transaction with test address below.'
        ],
        phase5: [
          '[Coconut Vault] Select Sign.',
          '[Coconut Vault] Scan QR on the Coconut Wallet.',
          '[Coconut Vault] Sign the transaction.'
        ],
        phase6: [
          '[Coconut Wallet] Scan QR on the Coconut Vault.',
          '[Coconut Wallet] Broadcast the Transaction on the Coconut Wallet.'
        ]
      }
    }
  };

  const phases = ['phase1', 'phase2', 'phase3', 'phase5', 'phase6'];
  const phaseLabels = {
    phase1: content[language].phases.phase1,
    phase2: content[language].phases.phase2,
    phase3: content[language].phases.phase3,
    phase5: content[language].phases.phase5,
    phase6: content[language].phases.phase6
  };

  const getCurrentGuide = () => {
    if (!walletType) return [];
    const walletGuide = walletGuides[walletType];
    if (!walletGuide) return [];
    const langGuide = walletGuide[language];
    if (!langGuide) return [];
    const currentPhaseKey = phases[currentPhase - 1];
    return langGuide[currentPhaseKey] || [];
  };

  const formatText = (text: string) => {
    // 색상 적용: 비밀번호(붉은계열), 버튼명(주황계열), 니모닉(노랑계열), 앱이름(푸른계열), 기기이름(초록계열)
    let formatted = text;
    
    // HTML 태그 내부가 아닌 텍스트만 매칭하는 헬퍼 함수
    const replaceOutsideTags = (str: string, pattern: RegExp, replacement: string | ((match: string, ...args: any[]) => string), useFullContext = false) => {
      const parts: string[] = [];
      let lastIndex = 0;
      
      // HTML 태그 위치 찾기
      const tagPositions: Array<{ start: number; end: number }> = [];
      const tagRegex = /<[^>]+>/g;
      let tagMatch;
      while ((tagMatch = tagRegex.exec(str)) !== null) {
        tagPositions.push({ start: tagMatch.index, end: tagMatch.index + tagMatch[0].length });
      }
      
      // 패턴 매칭 (새로운 RegExp 인스턴스 사용하여 lastIndex 문제 방지)
      const newPattern = new RegExp(pattern.source, pattern.flags);
      let match;
      while ((match = newPattern.exec(str)) !== null) {
        const matchStart = match.index;
        const matchEnd = matchStart + match[0].length;
        
        // HTML 태그 내부인지 확인
        const isInsideTag = tagPositions.some(tag => matchStart >= tag.start && matchEnd <= tag.end);
        
        if (!isInsideTag) {
          // 태그 외부이므로 치환
          const replacementText = typeof replacement === 'function' 
            ? useFullContext
              ? replacement(match[0], matchStart, matchEnd, str, ...match.slice(1))
              : replacement(match[0], ...match.slice(1))
            : replacement;
          parts.push(str.substring(lastIndex, matchStart));
          parts.push(replacementText);
          lastIndex = matchEnd;
        }
      }
      
      parts.push(str.substring(lastIndex));
      return parts.join('');
    };
    
    // 니모닉 (노랑계열)
    formatted = replaceOutsideTags(
      formatted,
      /\babandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon about\b/g,
      '<span class="text-yellow-600 dark:text-yellow-400 font-semibold">abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon about</span>'
    );
    
    // 특수 키워드 먼저 처리 - [Coconut Wallet]을 하나의 키워드로 처리
    formatted = replaceOutsideTags(
      formatted,
      /\[Coconut Wallet\]/g,
      '<span class="text-blue-600 dark:text-blue-400 font-semibold">[Coconut Wallet]</span>'
    );
    
    // 기기 이름 (초록계열) - Coconut Wallet 제외
    formatted = replaceOutsideTags(
      formatted,
      /\[(SeedSigner|Krux|Jade|Keystone|Keystone 3 Pro|Coldcard|Coconut Vault)\]/g,
      (match, device) => `<span class="text-green-600 dark:text-green-400 font-semibold">[${device}]</span>`
    );
    
    // BlueWallet, Sparrow도 푸른색으로
    formatted = replaceOutsideTags(
      formatted,
      /\b(BlueWallet|Sparrow)\b/g,
      (match, app) => `<span class="text-blue-600 dark:text-blue-400 font-semibold">${app}</span>`
    );
    
    // 비밀번호 (붉은계열)
    formatted = replaceOutsideTags(
      formatted,
      /\b090103\b/g,
      '<span class="text-red-600 dark:text-red-400 font-semibold">090103</span>'
    );
    
    // 버튼명 (주황계열) - 주요 버튼명 리스트 (긴 것부터 정렬)
    const buttonNames = [
      'Try adding a watch-only wallet!', '보기 전용 지갑을 추가해 보세요!', 'Export to Watch-only Wallet', 'Network: Mainnet',
      'Enter 12-word seed', 'Extended Public Key', 'VPUB - QR Code', 'Load from camera',
      'Sign to QR code', 'Temporary Signer', 'Connect Software Wallet', 'Advanced/Tools',
      'Export Wallet', 'Sparrow Wallet', 'Ready to Sign', 'OK TO SEND?', 'Scan PSBT',
      'Load Mnemonic', 'Via Manual Input', 'Load Wallet', 'Scan QR', 'Export Xpub',
      'Single Sig', 'Native Segwit', '12 Words', 'Network', 'Testnet', 'Customize',
      'Options', 'Device', 'Settings', 'Words', 'Yes', 'No', 'QR', 'Sign',
      'PSBT', 'SCAN', 'Seeds', 'ENTER', 'CANCEL', 'hen comic', 'BlueWallet','Sparrow', '[SeedSigner]'
    ];
    
    // 긴 버튼명부터 매칭 (더 구체적인 매칭을 위해)
    buttonNames.sort((a, b) => b.length - a.length);
    
    buttonNames.forEach(buttonName => {
      const escapedButton = buttonName.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      // 한글 텍스트는 \b가 작동하지 않으므로 직접 매칭
      const isKorean = /[가-힣]/.test(buttonName);
      const pattern = isKorean 
        ? new RegExp(escapedButton, 'g')
        : new RegExp(`\\b${escapedButton}\\b`, 'g');
      formatted = replaceOutsideTags(
        formatted,
        pattern,
        `<span class="text-orange-600 dark:text-orange-400 font-semibold">${buttonName}</span>`
      );
    });
    
    // 단독 "Wallet" 버튼명 처리 (Coconut Wallet이 아닌 경우에만)
    formatted = replaceOutsideTags(
      formatted,
      /\bWallet\b/g,
      (match, matchStart, matchEnd, fullString) => {
        // 앞뒤 컨텍스트 확인하여 Coconut Wallet인지 체크
        const before = fullString.substring(Math.max(0, matchStart - 15), matchStart);
        const after = fullString.substring(matchEnd, Math.min(fullString.length, matchEnd + 5));
        
        // Coconut Wallet이 이미 HTML 태그로 처리되었는지 확인
        if (before.includes('Coconut') || before.includes('Coconut Wallet')) {
          return match; // Coconut Wallet 내부의 Wallet은 그대로 반환
        }
        
        return '<span class="text-orange-600 dark:text-orange-400 font-semibold">Wallet</span>';
      },
      true // useFullContext = true
    );
    
    // 더보기 아이콘을 이미지로 대체 (주황색)
    formatted = replaceOutsideTags(
      formatted,
      /더보기 아이콘/g,
      '<img src="/images/experence/more.svg" alt="더보기" class="inline-block w-5 h-5 align-middle" style="filter: brightness(0) saturate(100%) invert(60%) sepia(90%) saturate(2000%) hue-rotate(0deg) brightness(1) contrast(1);" />'
    );
    
    // more options icon을 이미지로 대체 (주황색)
    formatted = replaceOutsideTags(
      formatted,
      /\bmore options icon\b/g,
      '<img src="/images/experence/more.svg" alt="more options" class="inline-block w-5 h-5 align-middle" style="filter: brightness(0) saturate(100%) invert(60%) sepia(90%) saturate(2000%) hue-rotate(0deg) brightness(1) contrast(1);" />'
    );
    
    return formatted;
  };

  const handleNext = () => {
    if (step === 1) {
      setStep(2);
    } else if (step === 2) {
      if (phoneOS) {
        setStep(3);
      }
    } else if (step === 3) {
      setStep(4);
    } else if (step === 4) {
      if (walletType) {
        setStep(5);
        setCurrentPhase(1);
      }
    } else if (step === 5) {
      if (currentPhase < phases.length) {
        setCurrentPhase(currentPhase + 1);
      } else {
        setStep(6);
      }
    }
  };

  const handlePrev = () => {
    if (step === 2) {
      setStep(1);
    } else if (step === 3) {
      setStep(2);
    } else if (step === 4) {
      setStep(3);
    } else if (step === 5) {
      if (currentPhase > 1) {
        setCurrentPhase(currentPhase - 1);
      } else {
        setStep(4);
      }
    } else if (step === 6) {
      setStep(5);
      setCurrentPhase(phases.length);
    } else if (step === 7) {
      setStep(6);
    }
  };

  const renderStep = () => {
    if (step === 1) {
      return (
        <div className="flex flex-col items-center justify-center min-h-[60vh] text-center px-6">
          <h1 className="text-4xl md:text-5xl font-bold mb-8 bg-gradient-to-r from-foreground to-bitcoin bg-clip-text text-transparent">
            {content[language].welcome.title}
          </h1>
          <div className="space-y-4 mb-8 max-w-2xl">
            <p className="text-xl">{content[language].welcome.message1}</p>
            <p className="text-xl">{content[language].welcome.message2}</p>
            <p className="text-xl text-red-500">{content[language].welcome.message3}</p>
          </div>
          <Button onClick={handleNext} size="lg" className="bg-bitcoin hover:bg-bitcoin-dark">
            {content[language].welcome.button}
          </Button>
        </div>
      );
    }

    if (step === 2) {
      return (
        <div className="flex flex-col items-center justify-center min-h-[60vh] text-center px-6">
          <h2 className="text-3xl md:text-4xl font-bold mb-6">{content[language].phoneSelection.title}</h2>
          <p className="text-xl mb-8">{content[language].phoneSelection.message}</p>
          <div className="flex gap-6">
            <button
              onClick={() => {
                setPhoneOS('android');
                handleNext();
              }}
              className={`flex flex-col items-center p-6 border-2 rounded-lg transition-all ${
                phoneOS === 'android' ? 'border-bitcoin bg-bitcoin/10' : 'border-border hover:border-bitcoin/50'
              }`}
            >
              <img src="/images/experence/playstore.png" alt="Android" className="w-24 h-24 mb-4" />
              <span className="text-lg font-semibold">{content[language].phoneSelection.android}</span>
            </button>
            <button
              onClick={() => {
                setPhoneOS('ios');
                handleNext();
              }}
              className={`flex flex-col items-center p-6 border-2 rounded-lg transition-all ${
                phoneOS === 'ios' ? 'border-bitcoin bg-bitcoin/10' : 'border-border hover:border-bitcoin/50'
              }`}
            >
              <img src="/images/experence/appstore.png" alt="iOS" className="w-24 h-24 mb-4" />
              <span className="text-lg font-semibold">{content[language].phoneSelection.ios}</span>
            </button>
          </div>
        </div>
      );
    }

    if (step === 3) {
      return (
        <div className="flex flex-col items-center justify-center min-h-[60vh] text-center px-6">
          <h2 className="text-3xl md:text-4xl font-bold mb-6">{content[language].download.title}</h2>
          <p className="text-xl mb-8">
            {phoneOS === 'android' ? content[language].download.android : content[language].download.ios}
          </p>
          <img
            src={phoneOS === 'android' ? '/images/experence/google_download_qr.png' : '/images/experence/apple_download_qr.png'}
            alt="Download QR"
            className="w-64 h-64 mb-8"
          />
          <Button onClick={handleNext} size="lg" className="bg-bitcoin hover:bg-bitcoin-dark">
            {content[language].download.button}
          </Button>
        </div>
      );
    }

    if (step === 4) {
      const wallets = [
        { name: 'SeedSigner', icon: '/images/experence/seed-signer.svg' },
        { name: 'Jade Plus', icon: '/images/experence/jade.svg' },
        { name: 'Krux', icon: '/images/experence/krux.svg' },
        { name: 'Keystone 3 Pro', icon: '/images/experence/keystone.svg' },
        { name: 'Coldcard Q', icon: '/images/experence/coldcard.svg' },
        { name: 'Coconut Vault', icon: '/images/experence/coconut.svg' }
      ];

      return (
        <div className="flex flex-col items-center justify-center min-h-[60vh] text-center px-6">
          <h2 className="text-3xl md:text-4xl font-bold mb-6">{content[language].walletSelection.title}</h2>
          <p className="text-xl mb-8">{content[language].walletSelection.message}</p>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-4 max-w-4xl">
            {wallets.map((wallet) => (
              <button
                key={wallet.name}
                onClick={() => {
                  setWalletType(wallet.name as WalletType);
                  handleNext();
                }}
                className={`flex flex-col items-center p-6 border-2 rounded-lg transition-all ${
                  walletType === wallet.name ? 'border-bitcoin bg-bitcoin/10' : 'border-border hover:border-bitcoin/50'
                }`}
              >
                <img src={wallet.icon} alt={wallet.name} className="w-20 h-20 mb-4" />
                <span className="text-sm font-semibold text-green-600 dark:text-green-400">{wallet.name}</span>
              </button>
            ))}
          </div>
        </div>
      );
    }

    if (step === 5) {
      const guides = getCurrentGuide();
      const showReceivingQR = phases[currentPhase - 1] === 'phase3';

      return (
        <div className="flex flex-col items-center justify-center min-h-[60vh] px-6 max-w-4xl mx-auto">
          <h2 className="text-2xl md:text-3xl font-bold mb-8 text-green-600 dark:text-green-400 text-center">
            {phaseLabels[phases[currentPhase - 1] as keyof typeof phaseLabels]}
          </h2>
          <div className="w-full space-y-4 mb-8">
            {guides.map((guide, index) => (
              <div
                key={index}
                className="flex items-start gap-4 p-4 rounded-lg bg-card border border-border"
              >
                <div className="flex-shrink-0 w-8 h-8 rounded-full bg-gray-200 dark:bg-gray-700 text-black dark:text-white flex items-center justify-center font-bold">
                  {index + 1}
                </div>
                <div
                  className="flex-1 text-left text-lg leading-relaxed"
                  dangerouslySetInnerHTML={{ __html: formatText(guide) }}
                />
              </div>
            ))}
          </div>
          {showReceivingQR && (
            <div className="mb-8">
              <img
                src="/images/experence/receiving_qr.png"
                alt="Receiving QR"
                className="w-64 h-64 mx-auto"
              />
            </div>
          )}
          <div className="flex gap-4">
            <Button onClick={handlePrev} variant="outline" size="lg">
              {content[language].prev}
            </Button>
            <Button onClick={handleNext} size="lg" className="bg-bitcoin hover:bg-bitcoin-dark">
              {content[language].next}
            </Button>
          </div>
        </div>
      );
    }

    if (step === 6) {
      return (
        <div className="flex flex-col items-center justify-center min-h-[60vh] text-center px-6">
          <h2 className="text-3xl md:text-4xl font-bold mb-8">{content[language].final.question}</h2>
          <div className="flex gap-4 flex-wrap justify-center">
            <Button
              onClick={() => setStep(8)}
              size="lg"
              className="bg-green-600 hover:bg-green-700"
            >
              {content[language].final.yes}
            </Button>
            <Button
              onClick={() => setStep(7)}
              size="lg"
              variant="outline"
            >
              {content[language].final.no}
            </Button>
          </div>
        </div>
      );
    }

    if (step === 7) {
      return (
        <div className="flex flex-col items-center justify-center min-h-[60vh] text-center px-6">
          <h2 className="text-3xl md:text-4xl font-bold mb-8 text-orange-600 dark:text-orange-400">
            {content[language].final.retryMessage}
          </h2>
          <div className="flex gap-4">
            <Button
              onClick={handlePrev}
              variant="outline"
              size="lg"
            >
              {content[language].prev}
            </Button>
            <Button
              onClick={handleHome}
              size="lg"
              className="bg-bitcoin hover:bg-bitcoin-dark"
            >
              {content[language].home}
            </Button>
          </div>
        </div>
      );
    }

    if (step === 8) {
      return (
        <div className="relative flex flex-col items-center justify-center min-h-[60vh] text-center px-6 overflow-hidden">
          {/* 폭죽 효과 */}
          <div className="absolute inset-0 pointer-events-none">
            {[...Array(50)].map((_, i) => (
              <div
                key={i}
                className="absolute confetti"
                style={{
                  left: `${Math.random() * 100}%`,
                  top: `${Math.random() * 100}%`,
                  width: `${Math.random() * 10 + 5}px`,
                  height: `${Math.random() * 10 + 5}px`,
                  backgroundColor: ['#FF6B6B', '#4ECDC4', '#45B7D1', '#FFA07A', '#98D8C8', '#F7DC6F', '#BB8FCE'][Math.floor(Math.random() * 7)],
                  animationDelay: `${Math.random() * 2}s`,
                  animationDuration: `${Math.random() * 2 + 2}s`,
                }}
              />
            ))}
          </div>
          
          <h2 className="text-4xl md:text-5xl font-bold mb-8 text-green-600 dark:text-green-400 relative z-10 animate-bounce">
            {content[language].final.congratulations}
          </h2>
          
          <div className="flex gap-4 relative z-10">
            <Button
              onClick={handleHome}
              size="lg"
              className="bg-bitcoin hover:bg-bitcoin-dark"
            >
              {content[language].home}
            </Button>
          </div>

          <style>{`
            @keyframes confetti-fall {
              0% {
                transform: translateY(-100vh) rotate(0deg);
                opacity: 1;
              }
              100% {
                transform: translateY(100vh) rotate(720deg);
                opacity: 0;
              }
            }
            .confetti {
              animation: confetti-fall linear infinite;
              border-radius: 50%;
            }
          `}</style>
        </div>
      );
    }
  };

  const handleHome = () => {
    setStep(1);
    setPhoneOS(null);
    setWalletType(null);
    setCurrentPhase(1);
  };

  return (
    <div className="min-h-screen bg-background fixed inset-0 z-50 overflow-y-auto">
      <div className="container mx-auto px-6 py-8">
        <div className="flex justify-between items-center mb-8">
          <Button
            onClick={handleHome}
            variant="ghost"
            className="flex items-center gap-2"
          >
            <Home className="w-5 h-5" />
            {content[language].home}
          </Button>
          {step === 1 && (
            <Button
              onClick={toggleLanguage}
              variant="outline"
              className="flex items-center gap-2"
            >
              {language === 'ko' ? 'EN' : '한글'}
            </Button>
          )}
        </div>
        {renderStep()}
      </div>
    </div>
  );
};

export default WalletExperience;
