import { Search } from 'lucide-react';
import Input from '@/components/ui/Input';

function SearchBox(props) {
  return (
    <Input
      leftIcon={Search}
      placeholder="Search"
      {...props}
    />
  );
}

export default SearchBox;
