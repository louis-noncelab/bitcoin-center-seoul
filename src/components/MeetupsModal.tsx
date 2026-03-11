import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { useLanguage } from '@/contexts/LanguageContext';

interface MeetupsModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const MeetupsModal = ({ open, onOpenChange }: MeetupsModalProps) => {
  const { language } = useLanguage();

  const meetups = {
    ko: [
      {
        title: '비트코인 개발자 밋업',
        tags: ['매월', '개발자', '유료', '4시간'],
        description: [
          '비트코인의 다양한 기술적 이슈와 개발 주제를 함께 이야기하는 밋업입니다.',
          '개발자들에게는 깊이 있는 기술 교류의 장이 되고,',
          '비개발자에게도 비트코인의 기술과 최신 이슈를 이해할 수 있는 기회가 됩니다.',
          '',
          '기술적 토론과 네트워킹을 통해 비트코인의 현재와 미래를 함께 이야기해보세요.'
        ]
      },
      {
        title: 'Bitcoin Monthly',
        tags: ['매월', '누구나', '유료'],
        description: [
          '한 달 동안 국내외에서 있었던 비트코인 관련 주요 뉴스와 이슈를 정리하여 함께 공유합니다.',
          '기술 업데이트, 정책 변화, 글로벌 커뮤니티 소식 등 다양한 주제를 살펴보며',
          '참석자들과 자유롭게 의견을 나누는 시간을 가집니다.',
          '',
          '빠르게 변화하는 비트코인 흐름을 함께 이해하고 이야기해보세요.',
          '본 행사는 비트코인 교육 전문 기관인 비토문에서 주최 합니다.'
        ]
      },
      {
        title: '비트코인 무비 나잇',
        tags: ['매월', '누구나', '입장료', '4시간'],
        description: [
          '비트코인센터서울에 함께 모여 비트코인과 관련된 영화와 다큐멘터리를 시청하고',
          '영화 속 이야기와 메시지에 대해 자유롭게 대화를 나누는 시간입니다.',
          '',
          '편안한 분위기에서 팝콘과 음료를 즐기며',
          '비트코이너들과 함께 특별한 밤을 보내보세요.',
          '본 행사는 비트코인 문화를 선도하는 새러데이 블록이 주최 합니다.'
        ]
      },
      {
        title: 'Saturday ₿ash',
        tags: ['매월', '누구나', '유료'],
        description: [
          '매월 셋째주 토요일에 다양한 콘텐츠로 즐거운 밋업을 진행합니다.',
          '',
          '보드게임, 다과, 자유로운 네트워킹까지—',
          '비트코인을 좋아하는 사람들이 모여 편하게 이야기하고 교류하는 시간입니다.',
          '본 행사는 비트코인 문화를 선도하는 새러데이 블록이 주최 합니다.'
        ]
      },
      {
        title: 'Global Bitcoin Community Connection',
        tags: ['연간', '누구나', '유료', '글로벌'],
        description: [
          '전 세계의 비트코이너들이 한 장소에 모여',
          '서로 교류하고 즐거운 시간을 보내는 특별한 행사입니다.',
          '',
          '해외의 다양한 비트코이너들과 직접 만나',
          '비트코인에 대한 경험과 이야기를 나누며',
          '글로벌 커뮤니티와 연결되는 기회를 만들어보세요.',
          '본 행사는 비트코인센터서울과 새러데이 블록이 함께 주최합니다.'
        ]
      },
      {
        title: '비트코인 제네시스 위크',
        tags: ['연간', '누구나', '스페셜'],
        description: [
          '2009년 1월 3일, 비트코인의 탄생을 기념하기 위해',
          '비트코인 생일 주간(Genesis Week) 동안 다양한 행사와 파티가 열립니다.',
          '',
          '비트코인의 시작을 함께 축하하며',
          '다채로운 프로그램이 진행됩니다.',
          '',
          '비트코인의 역사적인 순간을',
          '비트코인센터서울과 함께 기념해보세요.',
          '본 행사는 비트코인센터서울과 새러데이 블록이 함께 주최합니다.'
        ]
      }
    ],
    en: [
      {
        title: 'Bitcoin Developer Meetup',
        tags: ['Monthly', 'Developers', 'Paid', '4 hours'],
        description: [
          'A meetup to discuss various technical issues and development topics around Bitcoin.',
          'It provides a deep technical exchange for developers,',
          'and also an opportunity for non-developers to understand Bitcoin technology and the latest issues.',
          '',
          'Join technical discussions and networking to talk about the present and future of Bitcoin together.'
        ]
      },
      {
        title: 'Bitcoin Monthly',
        tags: ['Monthly', 'Open to All', 'Paid'],
        description: [
          'We share and discuss major Bitcoin-related news and issues from both domestic and international sources over the past month.',
          'We explore various topics including technical updates, policy changes, and global community news,',
          'while freely exchanging opinions with participants.',
          '',
          'Join us to understand and discuss the rapidly changing Bitcoin landscape together.',
          'This event is hosted by Bitomon, a professional Bitcoin education institution.'
        ]
      },
      {
        title: 'Bitcoin Movie Night',
        tags: ['Monthly', 'Open to All', 'Admission Fee', '4 hours'],
        description: [
          'Monthly movie screening event is held in Bitcoin Center Seoul.',
          '',
          'We gather to watch Bitcoin-related movies and documentaries,',
          'and freely talk about the stories and messages in the films.',
          '',
          'Enjoy free popcorn and drinks in a relaxed atmosphere,',
          'and spend a special night with the Bitcoin community.',
          'This event is held by Saturday Block.'
        ]
      },
      {
        title: 'Saturday ₿ash',
        tags: ['Monthly', 'Open to All', 'Paid'],
        description: [
          'Every third Saturday of the month, we gather for a fun meetup with various content.',
          '',
          'From board games and snacks to casual networking,',
          'it is a time for Bitcoin enthusiasts to gather, talk, and connect comfortably.'
        ]
      },
      {
        title: 'Global Bitcoin Community Connection',
        tags: ['Yearly', 'Open to All', 'Paid', 'Global'],
        description: [
          'Bitcoiners from all over the world gather in one place,',
          'to connect with each other and enjoy a memorable time.',
          '',
          'Meet diverse Bitcoiners from abroad,',
          'share your experiences and stories about Bitcoin,',
          'and build connections with the global community.',
          'This event is held together with Saturday Block.'
        ]
      },
      {
        title: 'Bitcoin Genesis Week',
        tags: ['Yearly', 'Open to All', 'Special'],
        description: [
          'To commemorate the birth of Bitcoin on January 3, 2009,',
          'various events and parties are held during Bitcoin\'s birthday week, the Genesis Week.',
          '',
          'We celebrate the beginning of Bitcoin together,',
          'with a wide range of programs throughout the week.',
          '',
          'Join Bitcoin Center Seoul to commemorate',
          'this historic moment in Bitcoin\'s history.',
          'This event is held together with Saturday Block.'
        ]
      }
    ]
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-2xl md:text-3xl font-bold">
            {language === 'ko' ? '정기 밋업과 행사' : 'Regular Meetups and Events'}
          </DialogTitle>
        </DialogHeader>
        <div className="space-y-8 mt-4">
          {meetups[language].map((meetup, index) => (
            <div key={index} className="border-b border-border pb-6 last:border-b-0">
              <div className="mb-4">
                <h3 className="text-xl md:text-2xl font-semibold mb-3">
                  {index + 1}. {meetup.title}
                </h3>
                <div className="flex flex-wrap gap-2">
                  {meetup.tags.map((tag, tagIndex) => (
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
                {meetup.description.map((line, lineIndex) => (
                  <p key={lineIndex}>
                    {line || <span className="block h-2" />}
                  </p>
                ))}
              </div>
              {index < meetups[language].length - 1 && (
                <div className="mt-6 text-center text-muted-foreground">
                  ⸻
                </div>
              )}
            </div>
          ))}
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default MeetupsModal;

