import React, {useEffect} from 'react';
import {ScrollView, View} from 'react-native';
import {css} from 'kstyled';
import {Link, Stack} from 'expo-router';
import {t} from '../src/STRINGS';
import {styled} from 'kstyled';
import {Typography} from 'cpk-ui';
import {logScreenView} from '../src/utils/analytics';

export default function PrivacyPolicy(): JSX.Element {
  useEffect(() => {
    if (!__DEV__)
      logScreenView({
        screen_name: 'privacyandpolicy',
        screen_class: 'PrivacyPolicy',
      });
  }, []);

  return (
    <Container>
      <Stack.Screen options={{title: t('common.privacyPolicy')}} />
      <Section>
        <Title>How We Protect Your Information</Title>
        <StyledTypography>
          At HyoDev, we prioritize safeguarding your personal information. This
          Privacy Policy outlines how we protect your data and address concerns
          promptly, in line with the Act on Promotion of Information and
          Communications Network Utilization and Information Protection, the
          Personal Information Protection Act, and other relevant laws.
        </StyledTypography>
      </Section>

      <Section>
        <Title>What Information We Collect</Title>
        <StyledTypography>
          1. We collect the following personal information to manage your
          membership, provide services, process payments, and support other
          service-related needs:
          {'\n\n'}
          1) Membership Registration and Management
          {'\n'}- Required: Login ID, password, email address, nickname, field
          of expertise
          {'\n\n'}
          2) The following data may be automatically collected during your use
          of our services:
          {'\n'}- IP address, device unique identifier, service usage records,
          visit history, records of improper use
          {'\n\n'}
          2. How We Collect Information
          {'\n'}
          Through our app (during registration), phone consultations via our
          customer center, or email-based online consultations
        </StyledTypography>
      </Section>

      <Section>
        <Title>Why We Collect Your Information</Title>
        <StyledTypography>
          We collect your personal information solely for the purposes below and
          will not use it for other reasons. If our purpose changes, we’ll seek
          your consent as required by Article 18 of the Personal Information
          Protection Act. In this policy, our website and app are referred to as
          the “Service.”
          {'\n\n'}
          Purpose: To manage memberships and deliver goods or services
          {'\n\n'}
          Collected Information: Login ID, password, email address, nickname,
          field of expertise, photo, mobile phone number, IP address, device
          unique identifier, service usage records, visit history, records of
          improper use, name, address, credit card number, bank account
          information, and other payment details
          {'\n\n'}
          Retention Period: Until you withdraw from the Service or until service
          delivery and payment settlement are complete
          {'\n\n'}
          However, we may retain data longer if required by law:
          {'\n\n'}
          1) Act on Consumer Protection in Electronic Commerce
          {'\n'}- Labeling and advertising records: 6 months
          {'\n'}- Contracts, subscription withdrawals, payments, and goods
          supply records: 5 years
          {'\n'}- Consumer complaints or dispute resolution records: 3 years
          {'\n\n'}
          2) Protection of Communications Secrets Act
          {'\n'}- Internet log records: 3 months
          {'\n\n'}
          3) Electronic Financial Transactions Act
          {'\n'}- Electronic financial transaction records: 5 years
        </StyledTypography>
      </Section>

      <Section>
        <Title>Your Rights and How to Exercise Them</Title>
        <StyledTypography>
          You or your legal representative can contact our team (Operations
          Team, Hyochan Jang, crossplatformkorea@gmail.com) at any time to
          access, correct, or delete your personal information or that of a
          child under 14.
          {'\n\n'}
          Requests for access or corrections can be made via email, phone, or
          written communication to our Personal Information Protection Officer,
          and we’ll respond promptly.
          {'\n\n'}
          If you request a correction for inaccurate information, we won’t use
          or share it until the correction is complete. If incorrect data has
          been shared with a third party, we’ll notify them immediately to
          ensure the correction is applied.
        </StyledTypography>
      </Section>

      <Section>
        <Title>Automatic Data Collection Tools</Title>
        <StyledTypography>
          We do not collect cookies from our users.
        </StyledTypography>
      </Section>

      <Section>
        <Title>Advertising and Consent</Title>
        <StyledTypography>
          We use Unity LevelPlay and Unity Ads to display banner and rewarded
          ads. Their SDKs may process device and network information, IP-based
          country information, ad views and interactions, and performance data
          to deliver and measure ads and prevent fraud. We apply child-directed
          settings and restrict device identifier use. Google User Messaging
          Platform manages consent where required; available privacy options
          can be reopened from My Page.
          {'\n\n'}
          <Link href="https://unity.com/legal/privacy-policy">
            Unity Privacy Policy
          </Link>
          {'\n'}
          <Link href="https://policies.google.com/privacy">
            Google Privacy Policy
          </Link>
        </StyledTypography>
      </Section>

      <Section>
        <Title>How We Delete Your Information</Title>
        <StyledTypography>
          1. We promptly delete personal information when it’s no longer needed,
          either due to the expiration of the retention period or fulfillment of
          its purpose.
          {'\n\n'}
          2. If we must retain data due to legal requirements beyond the
          consented period or purpose, we’ll store it in a separate database or
          location.
          {'\n\n'}
          3. Our deletion process is as follows:
          {'\n\n'}
          1) Deletion Process
          {'\n'}- We identify information eligible for deletion and destroy it
          with approval from our Personal Information Protection Officer.
          {'\n\n'}
          2) Deletion Methods
          {'\n'}- Electronic data is deleted using methods like low-level
          formatting to prevent recovery. Paper documents are shredded or
          incinerated.
          {'\n\n'}
          4. To request deletion:
          {'\n'}- Contact our team (Operations Team, Hyochan Jang,
          crossplatformkorea@gmail.com) at any time.
        </StyledTypography>
      </Section>

      <Section>
        <Title>Requesting Data Deletion</Title>
        <StyledTypography>
          To request deletion of your personal data:
          {'\n\n'}- Contact our team (Operations Team, Hyochan Jang,
          crossplatformkorea@gmail.com) at any time.
        </StyledTypography>
      </Section>

      <Section>
        <Title>How We Keep Your Information Secure</Title>
        <StyledTypography>
          We take the following steps to protect your personal information:
          {'\n\n'}
          a. Administrative: Internal management plans, regular staff training
          {'\n'}
          b. Technical: Access control for data systems, encryption of unique
          identifiers, security software installation
          {'\n'}
          c. Physical: Restricted access to server rooms and data storage areas
        </StyledTypography>
      </Section>

      <Section>
        <Title>Our Data Protection Officer</Title>
        <StyledTypography>
          1. We’ve appointed a Personal Information Protection Officer to
          oversee data handling, address complaints, and provide remedies for
          any issues:
          {'\n\n'}
          Personal Information Protection Officer
          {'\n'}- Name: Hyochan Jang
          {'\n'}- Department: Operations Team
          {'\n'}- Email: crossplatformkorea@gmail.com
          {'\n\n'}
          2. Feel free to reach out to our Data Protection Officer or team with
          any questions, complaints, or requests about your personal
          information. We’ll respond quickly to assist you.
        </StyledTypography>
      </Section>

      <Section>
        <Title>Support for Data Privacy Issues</Title>
        <StyledTypography>
          If you have concerns about personal information misuse, you can
          contact these independent organizations for help:
          {'\n\n'}
          If you’re not satisfied with our response to your privacy concerns or
          need further assistance, please reach out to:
          {'\n\n'}
          Personal Information Infringement Report Center (Korea Internet &
          Security Agency)
          {'\n'}- Services: Report privacy violations, request consultations
          {'\n'}- Website: privacy.kisa.or.kr
          {'\n'}- Phone: 118 (no area code)
          {'\n'}- Address: Korea Internet & Security Agency, 135 Jungdae-ro,
          Songpa-gu, Seoul 138-950
          {'\n\n'}
          Personal Information Dispute Mediation Committee (Korea Internet &
          Security Agency)
          {'\n'}- Services: Mediate privacy disputes, handle collective disputes
          (civil resolution)
          {'\n'}- Website: privacy.kisa.or.kr
          {'\n'}- Phone: 118 (no area code)
          {'\n'}- Address: Korea Internet & Security Agency, 135 Jungdae-ro,
          Songpa-gu, Seoul 138-950
          {'\n\n'}
          Supreme Prosecutors’ Office Cybercrime Investigation Team:
          +82-2-3480-3573 (www.spo.go.kr)
          {'\n'}
          National Police Agency Cyber Terror Response Center: +82-1566-0112
          (www.netan.go.kr)
        </StyledTypography>
      </Section>

      <Section>
        <Title>Updates to This Privacy Policy</Title>
        <StyledTypography>
          1. We’ll notify you of any changes to this Privacy Policy through our
          website’s “Notices” section at least 7 days in advance. Significant
          changes, like how we collect, use, or share your information, will be
          announced 30 days in advance.
          {'\n\n'}
          2. This Privacy Policy takes effect on February 6, 2025. You can view
          previous versions below.
        </StyledTypography>
      </Section>
      <View
        style={css`
          height: 40px;
        `}
      />
    </Container>
  );
}

const Container = styled(ScrollView)`
  flex: 1;
  padding: 16px;
  background-color: ${({theme}) => theme.bg.basic};
`;

const Section = styled.View`
  margin-bottom: 24px;
`;

const Title = styled.Text`
  font-size: 18px;
  font-weight: bold;
  margin-bottom: 8px;
  color: ${({theme}) => theme.text.basic};
`;

const StyledTypography = styled(Typography.Body2)`
  font-size: 16px;
  line-height: 24px;
`;
