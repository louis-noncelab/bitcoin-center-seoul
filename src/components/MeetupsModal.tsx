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
        title: '비트코인 무비 나잇',
        tags: ['매월', '누구나', '무료', '4시간'],
        description: [
          '함께 모여 비트코인과 관련된 영화와 다큐멘터리를 시청하고',
          '영화 속 이야기와 메시지에 대해 자유롭게 대화를 나누는 시간입니다.',
          '',
          '편안한 분위기에서 무료 팝콘과 음료를 즐기며',
          '비트코인 커뮤니티와 함께 특별한 밤을 보내보세요.'
        ]
      },
      {
        title: '비트코인 정기 밋업',
        tags: ['매월', '누구나', '유료'],
        description: [
          '비트코인 행사를 전문으로 기획하는 샛비(SatB)에서',
          '매월 다양한 콘텐츠로 즐거운 밋업을 진행합니다.',
          '',
          '보드게임, 다과, 자유로운 네트워킹까지—',
          '비트코인을 좋아하는 사람들이 모여 편하게 이야기하고 교류하는 시간입니다.'
        ]
      },
      {
        title: 'Global Bitcoin Community Connection',
        tags: ['연간', '누구나', '유료', '글로벌'],
        description: [
          '비트코인 행사 전문 기획팀 샛비(SatB)와 함께 주최하는',
          '글로벌 비트코인 커뮤니티 프로그램입니다.',
          '',
          '전 세계의 비트코이너들이 한 장소에 모여',
          '서로 교류하고 즐거운 시간을 보내는 특별한 행사입니다.',
          '',
          '해외의 다양한 비트코이너들과 직접 만나',
          '비트코인에 대한 경험과 이야기를 나누며',
          '글로벌 커뮤니티와 연결되는 기회를 만들어보세요.'
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
        title: 'Bitcoin Movie Night',
        tags: ['Monthly', 'Open to All', 'Free', '4 hours'],
        description: [
          'We gather to watch Bitcoin-related movies and documentaries,',
          'and freely talk about the stories and messages in the films.',
          '',
          'Enjoy free popcorn and drinks in a relaxed atmosphere,',
          'and spend a special night with the Bitcoin community.'
        ]
      },
      {
        title: 'Regular Bitcoin Meetup',
        tags: ['Monthly', 'Open to All', 'Paid'],
        description: [
          'Planned by SatB, a team specialized in organizing Bitcoin events,',
          'this meetup offers fun content every month.',
          '',
          'From board games and snacks to casual networking,',
          'it is a time for Bitcoin enthusiasts to gather, talk, and connect comfortably.'
        ]
      },
      {
        title: 'Global Bitcoin Community Connection',
        tags: ['Yearly', 'Open to All', 'Paid', 'Global'],
        description: [
          'A global Bitcoin community program hosted together with SatB,',
          'a professional Bitcoin event planning team.',
          '',
          'Bitcoiners from all over the world gather in one place,',
          'to connect with each other and enjoy a memorable time.',
          '',
          'Meet diverse Bitcoiners from abroad,',
          'share your experiences and stories about Bitcoin,',
          'and build connections with the global community.'
        ]
      }
    ]
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-2xl md:text-3xl font-bold">
            {language === 'ko' ? '정기 밋업' : 'Regular Meetups'}
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

