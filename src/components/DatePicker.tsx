import React, { useState } from 'react';
import { format } from 'date-fns';
import { ko } from 'date-fns/locale';
import { Calendar as CalendarIcon } from 'lucide-react';
import { DayPicker } from 'react-day-picker';
import { Button } from '@/components/ui/button';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { cn } from '@/lib/utils';

interface DatePickerProps {
  value?: string;
  onChange: (date: string) => void;
  placeholder?: string;
  className?: string;
}

const DatePicker: React.FC<DatePickerProps> = ({
  value,
  onChange,
  placeholder = "날짜를 선택하세요",
  className
}) => {
  const [open, setOpen] = useState(false);
  
  const selectedDate = value ? new Date(value) : undefined;

  const handleSelect = (date: Date | undefined) => {
    if (date) {
      // YYYY-MM-DD 형식으로 변환
      const formattedDate = format(date, 'yyyy-MM-dd');
      onChange(formattedDate);
      setOpen(false);
    }
  };

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          className={cn(
            "w-full justify-start text-left font-normal",
            !value && "text-muted-foreground",
            className
          )}
        >
          <CalendarIcon className="mr-2 h-4 w-4" />
          {value ? format(selectedDate!, 'PPP', { locale: ko }) : placeholder}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-auto p-0" align="start">
        <DayPicker
          mode="single"
          selected={selectedDate}
          onSelect={handleSelect}
          disabled={(date) => date < new Date(new Date().setHours(0, 0, 0, 0))}
          initialFocus
          locale={ko}
          modifiers={{
            today: new Date()
          }}
          modifiersStyles={{
            today: {
              fontWeight: 'bold',
              color: '#f7931a'
            }
          }}
        />
      </PopoverContent>
    </Popover>
  );
};

export default DatePicker;
