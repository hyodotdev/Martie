/**
 * @name CheckoutBrandTitle
 *
 * Stack header title with the PG brand mark for the Toss/Naver
 * checkout screens.
 */

import {css, styled} from 'kstyled';
import {Typography, useCPK} from 'cpk-ui';
import {NaverSignatureMark, TossWordmark} from './PaymentBrandMark';

type TitleProps = {
  mark: 'toss' | 'naver';
  title: string;
};

export default function CheckoutBrandTitle({
  mark,
  title,
}: TitleProps): JSX.Element {
  const {theme} = useCPK();

  return (
    <TitleRow>
      <ArtChip>
        {mark === 'toss' ? (
          <TossWordmark width={46} />
        ) : (
          <NaverSignatureMark width={60} />
        )}
      </ArtChip>
      <Typography.Body2
        numberOfLines={1}
        style={css`
          font-weight: bold;
          color: ${theme.text?.basic || '#37140B'};
        `}
      >
        {title}
      </Typography.Body2>
    </TitleRow>
  );
}

const TitleRow = styled.View`
  flex-direction: row;
  align-items: center;
  gap: 8px;
`;

const ArtChip = styled.View`
  border-radius: 8px;
  align-items: center;
  justify-content: center;
  padding: 5px 7px;
  background-color: #ffffff;
`;
