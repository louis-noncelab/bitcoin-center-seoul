import { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { useLanguage } from '@/contexts/LanguageContext';
import EventScheduleModal from '@/components/EventScheduleModal';

interface EducationCoursesModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const EducationCoursesModal = ({ open, onOpenChange }: EducationCoursesModalProps) => {
  const { language } = useLanguage();
  const [eventModalOpen, setEventModalOpen] = useState(false);

  const courses = {
    ko: [
      {
        title: '코코넛 볼트 사용자를 위한 셀프 커스터디 강의',
        tags: ['홀수월', '4째주 금요일', '지갑', '초보', '무료', '4시간'],
        description: [
          '매월 코코넛 볼트 구매자를 위한 셀프 커스터디 클래스가 열립니다.',
          '비트코인을 스스로 안전하게 보관하는 방법을 처음부터 차근차근 알려드립니다.',
          '',
          '처음에는 조금 어렵게 느껴질 수 있지만 걱정하지 마세요.',
          '완전히 이해하고 스스로 사용할 수 있을 때까지 함께 도와드립니다.'
        ]
      },
      {
        title: '비트코인 프로토콜의 이해 : 코딩 몰라도 이해하는 비트코인 백서 강의',
        tags: ['홀수월', '2째주 토요일', '프로토콜', '초보', '유료', '4시간'],
        description: [
          '비트코인이 어떻게 작동하는지 궁금하신가요?',
          '',
          '컴퓨터 전공자가 아니어도 이해할 수 있도록',
          '비트코인의 구동 원리를 쉽고 재미있게 설명합니다.',
          '',
          '백서에 등장하는 어려운 개념들도',
          '편안한 해설을 통해 함께 이해해 보세요.'
        ]
      },
      {
        title: '함께 듣고 함께 질문하는 비트코인 오렌지필 강의',
        tags: ['짝수월', '2째주 토요일', '입문', '초보', '유료', '3시간'],
        description: [
          '가족, 친구와 함께 들을 수 있는 비트코인 입문 클래스입니다.',
          '• 비트코인은 왜 탄생했을까?',
          '• 우리는 왜 비트코인이 필요할까?',
          '• 비트코인의 진짜 가치는 무엇일까?',
          '• 다가오는 시대의 비트코인의 위상과 역할은 무엇일까?',
          '비트코인의 가치와 의미를 쉽고 흥미롭게 함께 알아봅니다.'
        ]
      },
      {
        title: '비트코인 개발자 아카데미',
        tags: ['6월/12월', '개발자', '유료', '20시간', '수료증 발급'],
        description: [
          '비트코인을 깊이 있게 이해하고 직접 구현해보는 개발자 과정입니다.',
          '',
          '이 강의에서는',
          '• 유한체와 타원곡선 암호학',
          '• 디지털 서명',
          '• 트랜잭션의 구조',
          '• 블록과 채굴',
          '• 네트워크',
          '• 슈노르 서명과 탭루트',
          '',
          '등 비트코인의 핵심 기술을 배우고,',
          '',
          '직접 코드를 작성하고 트랜잭션을 만들어 네트워크로 전송하는 실습까지 진행합니다.',
          '',
          '비트코인의 메커니즘을 제대로 이해하고 싶은 개발자에게 추천합니다.'
        ]
      }
    ],
    en: [
      {
        title: 'Coconut Vault User Course',
        tags: ['Odd months', '4th Friday', 'Wallet', 'Beginner', 'Free', '4 hours'],
        description: [
          'A monthly self-custody class for Coconut Vault purchasers.',
          'We guide you step by step from the beginning on how to safely store Bitcoin yourself.',
          '',
          'It may feel a bit difficult at first, but don\'t worry.',
          'We will help you until you fully understand and can use it yourself.'
        ]
      },
      {
        title: 'Understanding Bitcoin Protocol: Bitcoin Whitepaper Course for Non-Coders',
        tags: ['Odd months', '2nd Saturday', 'Protocol', 'Beginner', 'Paid', '4 hours'],
        description: [
          'Are you curious about how Bitcoin works?',
          '',
          'We explain Bitcoin\'s operating principles in an easy and fun way',
          'so that even non-computer science majors can understand.',
          '',
          'We also explore difficult concepts from the whitepaper',
          'together through comfortable explanations.'
        ]
      },
      {
        title: 'Bitcoin Orange Pill Course: Listen and Ask Together',
        tags: ['Even months', '2nd Saturday', 'Introduction', 'Beginner', 'Paid', '3 hours'],
        description: [
          'A Bitcoin introductory class that you can attend with family and friends.',
          '• Why was Bitcoin created?',
          '• Why do we need Bitcoin?',
          '• What is the true value of Bitcoin?',
          '• What will be Bitcoin\'s status and role in the coming era?',
          'We explore Bitcoin\'s value and meaning together in an easy and interesting way.'
        ]
      },
      {
        title: 'Bitcoin Developer Academy',
        tags: ['June/December', 'Developer', 'Paid', '20 hours', 'Certificate Issued'],
        description: [
          'A developer course to deeply understand Bitcoin and implement it yourself.',
          '',
          'In this course, we learn:',
          '• Finite fields and elliptic curve cryptography',
          '• Digital signatures',
          '• Transaction structure',
          '• Blocks and mining',
          '• Network',
          '• Schnorr signatures and Taproot',
          '',
          'We learn Bitcoin\'s core technologies and',
          '',
          'proceed with hands-on practice including writing code and creating transactions to send to the network.',
          '',
          'Recommended for developers who want to properly understand Bitcoin\'s mechanisms.'
        ]
      }
    ]
  };

  const noticeText = {
    ko: {
      prefix: '강의 일정은 법정 공휴일이나 운영기관의 사정에 따라 변경되거나 취소될 수 있습니다. 상세 일정은 ',
      link: '이벤트 일정',
      suffix: '을 참고 바랍니다.'
    },
    en: {
      prefix: 'Course schedules may be subject to change or cancellation due to public holidays or circumstances of the operating institution. For detailed schedules, please refer to ',
      link: 'Event Schedule',
      suffix: '.'
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-2xl md:text-3xl font-bold">
            {language === 'ko' ? '교육 과정' : 'Education Courses'}
          </DialogTitle>
        </DialogHeader>
        <div className="space-y-8 mt-4">
          {courses[language].map((course, index) => (
            <div key={index} className="border-b border-border pb-6 last:border-b-0">
              <div className="mb-4">
                <h3 className="text-xl md:text-2xl font-semibold mb-3">
                  {index + 1}. {course.title}
                </h3>
                <div className="flex flex-wrap gap-2">
                  {course.tags.map((tag, tagIndex) => (
                    <span
                      key={tagIndex}
                      className="px-3 py-1 text-xs md:text-sm bg-muted rounded-full text-muted-foreground"
                    >
                      {tag}
                    </span>
                  ))}
                </div>
              </div>
              <div className="space-y-2 text-muted-foreground leading-relaxed">
                {course.description.map((line, lineIndex) => (
                  <p key={lineIndex} className={line.startsWith('•') ? 'ml-4' : ''}>
                    {line || <span className="block h-2" />}
                  </p>
                ))}
              </div>
              {index < courses[language].length - 1 && (
                <div className="mt-6 text-center text-muted-foreground">
                  ⸻
                </div>
              )}
            </div>
          ))}
        </div>
        <DialogFooter className="mt-6 pt-6 border-t border-border">
          <p className="text-center text-muted-foreground text-sm w-full">
            {noticeText[language].prefix}
            <button
              onClick={() => setEventModalOpen(true)}
              className="text-bitcoin hover:underline cursor-pointer"
            >
              {noticeText[language].link}
            </button>
            {noticeText[language].suffix}
          </p>
        </DialogFooter>
      </DialogContent>
      <EventScheduleModal 
        open={eventModalOpen} 
        onOpenChange={setEventModalOpen}
        showAutoOpen={false}
      />
    </Dialog>
  );
};

export default EducationCoursesModal;
