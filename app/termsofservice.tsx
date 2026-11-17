import {useEffect} from 'react';
import {logScreenView} from '../src/utils/analytics';
import {ScrollView, View} from 'react-native';
import {Stack} from 'expo-router';
import {t} from '../src/STRINGS';
import {styled} from 'kstyled';
import {Typography} from 'cpk-ui';

export default function TermsOfService(): JSX.Element {
  useEffect(() => {
    if (!__DEV__)
      logScreenView({
        screen_name: 'termsofservice',
        screen_class: 'TermsOfService',
      });
  }, []);

  return (
    <Container>
      <Stack.Screen options={{title: t('common.termsOfService')}} />
      <Section>
        <Title>Purpose of These Terms</Title>
        <StyledTypography>
          These Terms of Service outline the rights, responsibilities, and key
          details between you and HyoDev regarding your use of our services
          (referred to as the “Service”).
        </StyledTypography>
      </Section>

      <Section>
        <Title>Key Definitions</Title>
        <StyledTypography>
          1. Here’s what we mean by certain terms in these Terms of Service:
          {'\n\n'}
          1) "User" means anyone who agrees to these Terms and is authorized to
          use our services.
          {'\n'}
          2) "Service" includes all services we provide.
          {'\n'}
          3) "Device" refers to devices like PCs, mobile phones, smartphones,
          tablets, or wearables that can download or install our Service.
          {'\n'}
          4) "Application" is any software you download or install on these
          Devices to access our services.
          {'\n'}
          5) "App Store (Open Market) Operator" is any platform, like Google
          Play Store, Apple App Store, T Store, Olleh Market, or U+ App Market,
          that lets you install or pay for our Service, including in-service
          payments.
          {'\n'}
          6) "Platform Operator" refers to partners, like Naver (NHN Corp.) or
          Facebook (Meta, Inc.), who help promote or provide our Service.
          {'\n'}
          7) "User Account" is a unique combination of letters, numbers, or
          special characters you choose, assigned by a Platform Operator for
          Service access. We use a unique ID (numbers or letters) from the
          Platform Operator, not your explicit details (e.g., TID, UID, App
          Center ID).
          {'\n'}
          8) "Content" is any digital material you can access through your
          Device as part of our Service.
          {'\n'}
          9) "Paid Content" is online content, like cyber money, you buy through
          an App Store to unlock specific features or benefits in the Service.
          {'\n'}
          10) "Free Content" is online content you get without buying Paid
          Content, like gifts from other Users or items earned through Service
          use.
          {'\n'}
          11) "In-App Purchase" means buying items, features, or Paid Content
          within the Application.
          {'\n'}
          12) "In-App Item" includes items or points you can buy via In-App
          Purchases.
          {'\n'}
          13) "Membership Withdrawal" is when you choose to end your Service
          contract after signing up.
          {'\n\n'}
          2. Unless specified above, terms follow relevant laws or standard
          commercial practices if not covered by law.
        </StyledTypography>
      </Section>

      <Section>
        <Title>Company Information We Share</Title>
        <StyledTypography>
          We’ll display the following details on our Service’s main screen or
          website for easy access. You can find our Privacy Policy and Terms of
          Service via linked pages:
          {'\n\n'}
          a. Company name and representative’s name
          {'\n'}
          b. Business address (including where we handle complaints) and email
          {'\n'}
          c. Business and telecommunications sales registration numbers
          {'\n'}
          d. Privacy Policy
          {'\n'}
          e. Terms of Service
        </StyledTypography>
      </Section>

      <Section>
        <Title>How These Terms Apply and Change</Title>
        <StyledTypography>
          1. These Terms take effect when posted on our website or in our
          Application and when you install and use the Application. If you use
          the Application before agreeing to updated Terms, you’re still
          considered to have accepted them. If you disagree, you can log out and
          delete the Application to withdraw consent.
          {'\n\n'}
          2. We write these Terms clearly to help you understand them. Before
          you agree, we highlight key details—like canceling subscriptions,
          refunding overpayments, ending contracts, our exemptions, and your
          compensation rights—in bold or through pop-ups or linked pages.
          {'\n\n'}
          3. We may update these Terms to reflect legal changes or improve your
          rights and responsibilities, ensuring compliance with laws like the
          Act on Consumer Protection in Electronic Commerce, Act on Regulation
          of Terms and Conditions, Act on Promotion of Information and
          Communications Network Utilization and Information Protection, or
          Content Industry Promotion Act. Updates will include the effective
          date, changes, and reasons, announced on our website, community, or
          Application at least 7 days before (or 30 days for major changes
          affecting your rights) and for a period after. Updates apply from the
          effective date.
          {'\n\n'}
          4. You can reject updated Terms. If you don’t agree, you can stop
          using the Service, log out, delete the Application, and withdraw
          membership. If we announce that not objecting within 15 days (or by
          the enforcement date) or continuing Service use after the effective
          date means acceptance, you’re deemed to agree unless you explicitly
          refuse.
        </StyledTypography>
      </Section>

      <Section>
        <Title>Other Rules That Apply</Title>
        <StyledTypography>
          Anything not covered in these Terms or their interpretation follows
          the Act on Consumer Protection in Electronic Commerce, Act on
          Regulation of Terms and Conditions, Act on Promotion of Information
          and Communications Network Utilization and Information Protection,
          Content Industry Promotion Act, other relevant laws, or standard
          commercial practices.
        </StyledTypography>
      </Section>

      <Section>
        <Title>Starting Your Service Contract</Title>
        <StyledTypography>
          1. Your Service contract begins when you apply by installing the
          Application and agreeing to these Terms, and we approve your
          application.
          {'\n\n'}
          2. You must provide your real name and accurate information when
          applying. Using false information or someone else’s identity means you
          can’t claim rights under these Terms, and we may cancel or end your
          contract without a refund.
          {'\n\n'}
          3. Minors (under 18, including high school students per Article 2 of
          the Elementary and Secondary Education Act) need legal representative
          consent to apply.
          {'\n\n'}
          4. We may reject applications in these cases:
          {'\n\n'}
          1) Violations of our account rules
          {'\n'}
          2) Unpaid or unverifiable Service fees
          {'\n'}
          3) Minors applying without verifiable legal representative consent
          {'\n'}
          4) Users with usage restrictions in the past 3 months
          {'\n'}
          5) Unauthorized use of a third party’s credit card, phone, or bank
          account for Service fees
          {'\n'}
          6) Using the Service from countries outside South Korea where we
          haven’t approved Service provision, due to overseas contracts or other
          restrictions
          {'\n'}
          7) Applications intending illegal activities banned by laws like the
          Act on Promotion of Information and Communications Network Utilization
          and Information Protection
          {'\n'}
          8) Other cases similar to the above that we deem inappropriate
        </StyledTypography>
      </Section>

      <Section>
        <Title>Your Account and Password</Title>
        <StyledTypography>
          1. We assign you a unique account ID (letters, numbers, or special
          characters you pick) for data protection and Service guidance. We may
          restrict IDs that are offensive, against public morals, or could be
          confused with our staff.
          {'\n\n'}
          2. We use your account info to manage your Service access and related
          tasks.
          {'\n\n'}
          3. You’re responsible for keeping your account secure. Any damage from
          poor management or letting others use your account is on you.
          {'\n\n'}
          4. You can set a password within our guidelines and change it anytime.
          {'\n\n'}
          5. You manage your password, but we may suggest periodic or occasional
          changes for security.
        </StyledTypography>
      </Section>

      <Section>
        <Title>Providing and Updating Your Information</Title>
        <StyledTypography>
          1. You must provide accurate information when required by these Terms.
          False information leaves you unprotected from any resulting issues.
          {'\n\n'}
          2. You can view or edit your personal info (like photos or name)
          anytime via our account management interface.
          {'\n\n'}
          3. If your application info changes, update it online or notify us
          another way.
          {'\n\n'}
          4. We’re not responsible for problems caused by not informing us of
          changes.
        </StyledTypography>
      </Section>

      <Section>
        <Title>Protecting Your Personal Information</Title>
        <StyledTypography>
          1. We work to protect your personal info, including account details,
          per applicable laws and our separate Privacy Policy.
          {'\n\n'}
          2. Our Privacy Policy doesn’t cover third-party services linked on our
          website or apps, except for specific services we provide.
          {'\n\n'}
          3. We’re not liable for info exposed due to your own mistakes.
        </StyledTypography>
      </Section>

      <Section>
        <Title>Our Responsibilities</Title>
        <StyledTypography>
          1. We follow laws and fulfill our rights and duties under these Terms
          in good faith.
          {'\n\n'}
          2. If your complaint or feedback is valid, we’ll address it quickly
          within a reasonable time. If it takes longer, we’ll notify you of the
          reason and timeline via our website or directly.
          {'\n\n'}
          3. We maintain security systems to protect your personal and credit
          info for safe Service use, and we publicly share and follow our
          Privacy Policy. Unless allowed by these Terms or Privacy Policy, we
          won’t share your info with third parties.
          {'\n\n'}
          4. We’ll quickly fix or restore any equipment or data issues during
          Service upgrades, except for unavoidable cases like natural disasters,
          emergencies, or unsolvable tech problems.
          {'\n\n'}
          5. We aim to make contract processes—like signing, changing, or
          ending—convenient for you.
        </StyledTypography>
      </Section>

      <Section>
        <Title>Your Responsibilities</Title>
        <StyledTypography>
          1. You must use the Service as intended and avoid these actions:
          {'\n\n'}
          1) Giving false or someone else’s info for inquiries, Paid Content
          restoration, refunds, or events
          {'\n'}
          2) Pretending to be someone else, lying about relationships, stealing
          or misusing another User’s ID/password, or using a third party’s
          credit card, phone, or bank account for Paid Content without
          permission (per Article 70, Information and Communications Network
          Act)
          {'\n'}
          3) Trading or selling Paid Content through non-Company services
          {'\n'}
          4) Copying, sharing, promoting, or commercially using Service info
          without our consent, or exploiting bugs
          {'\n'}
          5) Using the Service to profit yourself or others
          {'\n'}
          6) Harming or defaming others (per Article 70, Information and
          Communications Network Act; Article 311, Criminal Act)
          {'\n'}
          7) Violating our or third-party intellectual property or portrait
          rights, or collecting/sharing other Users’ info without our approval
          {'\n'}
          8) Deceiving third parties for gain or misusing the Service, harming
          others
          {'\n'}
          9) Sharing obscene/vulgar content, linking to adult sites, or posting
          unapproved ads (per Article 44, Information and Communications Network
          Act)
          {'\n'}
          10) Encouraging or joining gambling or speculative activities
          {'\n'}
          11) Sending or sharing content that causes shame, disgust, or fear
          {'\n'}
          12) Sharing viruses or code meant to harm software, hardware, or
          telecom equipment
          {'\n'}
          13) Modifying the Application, hacking servers, reverse-engineering,
          leaking/changing code or data, or impersonating us without permission
          {'\n'}
          14) Posing as our staff or using someone else’s name to post or email
          {'\n'}
          15) Using the Service for unapproved commercial, political, or illegal
          election activities
          {'\n'}
          16) Other illegal or unjust acts violating public order, morals, or
          laws
          {'\n\n'}
          2. You must regularly check our website for notices and Term updates
          and avoid disrupting our operations.
          {'\n\n'}
          3. You’re responsible for securing your account and can’t let others
          use it. If we follow the Korea Communications Commission’s “Open
          Market Mobile Content Payment Guidelines” and Open Market Operator
          policies, you can’t claim refunds or compensation for third-party use
          or payments.
          {'\n\n'}
          4. We may detail restricted actions in our policies, and you must
          follow them:
          {'\n\n'}
          1) Limits on usernames and photos
          {'\n'}
          2) Chat content and method restrictions
          {'\n'}
          3) Bulletin board usage limits
          {'\n'}
          4) Posted content restrictions
          {'\n'}
          5) Other necessary rules that don’t infringe your core rights
        </StyledTypography>
      </Section>

      <Section>
        <Title>Service Availability and Pauses</Title>
        <StyledTypography>
          1. Your Service starts once we approve your membership, though some
          features may begin on a set date if needed.
          {'\n\n'}
          2. We offer the Service 24/7, year-round, unless technical or
          operational issues arise. We may pause the Service briefly for
          maintenance, server upgrades, content additions, bug fixes, or
          replacements, and we’ll notify you of details and timing via our
          website or app. If we can’t give advance notice due to unavoidable
          issues, we’ll inform you afterward.
        </StyledTypography>
      </Section>

      <Section>
        <Title>Service Content and Updates</Title>
        <StyledTypography>
          1. You can use the Service per these Terms, our policies, and rules.
          {'\n\n'}
          2. We have full control over creating, updating, maintaining, and
          fixing our Services.
          {'\n\n'}
          3. We may modify, add, or end parts or all of the Service for
          operational or technical needs, like new features or bug fixes. We’ll
          post changes and effective dates on our website as your notice.
          {'\n\n'}
          4. If we must end the entire Service due to planning, operations, or
          urgent needs, we’ll notify you via our website and stop the Service.
          You can’t request refunds for Paid Content with no remaining usage
          period when the Service ends.
          {'\n\n'}
          5. We may limit or pause the Service in these cases:
          {'\n\n'}
          1) Uncontrollable events like war, riots, natural disasters, or
          national emergencies
          {'\n'}
          2) Power outages, equipment failures, or usage surges disrupting
          normal Service
          {'\n'}
          3) Unavoidable maintenance or construction
          {'\n'}
          4) Other situations preventing Service provision
          {'\n\n'}
          6. For pauses under item 3, we’ll notify you via our website or app,
          unless uncontrollable issues prevent prior notice.
          {'\n\n'}
          7. We’re not responsible for issues from Service changes or pauses
          unless caused by our intentional or gross negligence.
        </StyledTypography>
      </Section>

      <Section>
        <Title>Information and Ads We Share</Title>
        <StyledTypography>
          1. To introduce or improve the Service, we may use data from Platform
          or App Store Operators or request more info from you. You can accept
          or decline these requests via the Platform or App Store Operator.
          {'\n\n'}
          2. We may show ads to support the Service, and you agree to see them
          during use.
          {'\n\n'}
          3. We’re not liable for losses from your interactions with third-party
          ads mentioned in item 2.
          {'\n\n'}
          4. If we use your lawfully collected personal info for ads, we may
          send them via SMS, push notifications, or email. You can opt out
          anytime.
          {'\n\n'}
          5. Info and ads follow the terms of Platform Operators, App Store
          Operators, us, and relevant laws.
        </StyledTypography>
      </Section>

      <Section>
        <Title>Buying and Using Paid Content</Title>
        <StyledTypography>
          1. You can buy Paid Content based on each App Store Operator’s payment
          rules, which may vary by Device and affect pricing. Payments follow
          the methods and policies of linked mobile carriers, Platform
          Operators, or App Store Operators.
          {'\n\n'}
          2. Paid Content is usable only on the Device where you downloaded or
          installed the Application.
          {'\n\n'}
          3. Paid Content generally lasts one year, after which you lose access.
          If a different period is specified at purchase, that applies. You can
          only use Paid Content in your account per our rules and can’t
          transfer, lend, or sell it.
        </StyledTypography>
      </Section>

      <Section>
        <Title>In-App Purchases</Title>
        <StyledTypography>
          1. Our Application includes In-App Purchase options for buying In-App
          Items.
          {'\n\n'}
          2. You must use Device or Open Market password settings to block
          third-party In-App Purchases. We use Open Market authentication
          modules per the Korea Communications Commission’s “Open Market Mobile
          Content Payment Guidelines.”
          {'\n\n'}
          3. We’re not responsible for third-party In-App Purchases due to your
          failure to set passwords or negligence in protecting them.
          {'\n\n'}
          4. In-App Purchases on a youth mobile plan are considered to have
          legal representative consent.
          {'\n\n'}
          5. You’re responsible for paying In-App Purchase fees.
          {'\n\n'}
          6. Payment limits may be set or adjusted per our policies or those of
          payment providers (mobile carriers, App Store Operators).
        </StyledTypography>
      </Section>

      <Section>
        <Title>Cancellations and Refunds</Title>
        <StyledTypography>
          1. You can cancel Purchased Paid Content without fees within 7 days
          from the contract or availability date. However, free Paid Content
          (e.g., gifts, events), used or partially used content, or similar
          items may not be cancellable per Article 17, Paragraph 2 of the Act on
          Consumer Protection in Electronic Commerce. We’ll notify you of
          restrictions at purchase as required by law.
          {'\n\n'}
          2. If you can’t use Paid Content due to our fault, we’ll replace it
          free or refund the full amount, regardless of purchase date.
          {'\n\n'}
          3. Refunds follow the App Store Operator’s policies and our
          procedures. Refunded amounts reduce your Paid Content in the Service.
          {'\n\n'}
          4. Paid Content converted to Free Content, partially/fully used,
          damaging its purchasable unit, or accepted via consent screens (e.g.,
          messages, gifts) is considered used, even if bought by a third party
          against your intent.
          {'\n\n'}
          5. Paid Content earned as rewards or from events, not regular
          purchases, isn’t refundable.
          {'\n\n'}
          6. Cancellation or refund requests require consenting to personal info
          handling via our customer center or agents, plus purchase history
          verification, possibly through Platform or App Store Operators. We may
          contact you to verify your request and ask for proof (e.g., Platform
          Operator info, App Store receipts, or documents like family
          certificates for unauthorized purchases).
          {'\n\n'}
          7. In-App Item cancellations are restricted in these cases, and we’ll
          note this before purchase, ensuring your cancellation rights aren’t
          blocked. If we don’t, you can cancel despite restrictions:
          {'\n\n'}
          1) Items used or applied immediately upon purchase
          {'\n'}
          2) Items gained without In-App Purchases during normal use
          {'\n'}
          3) Items with used extra benefits
          {'\n'}
          4) Partially used bundled items
          {'\n'}
          5) Opened items where opening equals use, time-passed unsalable items,
          or damaged reproducible goods
          {'\n\n'}
          8. Minors’ In-App Purchases without legal representative consent can
          be canceled by the minor or representative, unless within permitted
          property or if the minor posed as an adult. We check minor status via
          Device/payment method names. Cancellation requests need proof of minor
          or representative status.
          {'\n\n'}
          9. In-App Purchases follow Open Market payment methods. Overpayments
          require refund requests to the Open Market Operator, but we may assist
          with procedures if their policies allow.
          {'\n\n'}
          10. Gifted In-App Purchases are non-cancelable/refundable except for
          defective items, with refunds only for the gifting User.
        </StyledTypography>
      </Section>

      <Section>
        <Title>What Happens When You Cancel</Title>
        <StyledTypography>
          1. If you cancel under the Cancellations and Refunds section, we’ll
          promptly remove or delete the Paid Service and refund you within 3
          business days.
          {'\n\n'}
          2. If we delay your refund, we’ll pay interest based on the delay
          period and rates in the Act on Consumer Protection in Electronic
          Commerce and its Enforcement Decree.
          {'\n\n'}
          3. For refunds, if you paid by credit card or other methods in the
          Act’s Enforcement Decree, we’ll quickly ask the payment provider to
          stop or cancel billing. If we’ve received payment, we’ll refund it to
          the provider and notify you.
          {'\n\n'}
          4. If you’ve used part of the content, we may charge you for the
          benefit you received or our supply costs.
          {'\n\n'}
          5. You cover return costs, and we won’t charge penalties or damages
          due to your cancellation.
        </StyledTypography>
      </Section>

      <Section>
        <Title>Ending or Suspending Your Account</Title>
        <StyledTypography>
          1. You can end your contract anytime by withdrawing membership.
          {'\n\n'}
          2. Withdrawal takes 14 days to complete, with your info deleted. Your
          created content may remain.
          {'\n\n'}
          3. If you violate our usage rules in the Your Responsibilities
          section, disrupting our Service, we may end your contract or restrict
          access without notice for a set period.
          {'\n\n'}
          4. If we end or suspend your account under this section, you must
          delete the Application.
          {'\n\n'}
          5. For other reasons to end the contract, we’ll notify you in advance
          via email, text, or similar methods.
          {'\n\n'}
          6. We’re not liable for damages from valid restrictions.
        </StyledTypography>
      </Section>

      <Section>
        <Title>Temporary Account Restrictions</Title>
        <StyledTypography>
          1. We may suspend your account during investigations for:
          {'\n\n'}
          1) Valid reports of hacking or theft
          {'\n'}
          2) Suspected illegal activities, like using unauthorized programs or
          workshops
          {'\n'}
          3) Similar issues requiring temporary measures
          {'\n\n'}
          2. After investigation, we’ll extend paid Service time equal to the
          suspension for paying Users, unless you’re confirmed as an illegal
          User.
        </StyledTypography>
      </Section>

      <Section>
        <Title>Liability for Damages</Title>
        <StyledTypography>
          1. If you harm us by breaking these Terms or misusing the Service, you
          must compensate us for the damage.
          {'\n\n'}
          2. If your illegal actions or Term violations cause third-party
          claims, lawsuits, or issues against us, you’ll cover our costs and
          defend us. If we’re not protected, you’re liable for all damages.
        </StyledTypography>
      </Section>

      <Section>
        <Title>When We’re Not Liable</Title>
        <StyledTypography>
          1. We’re not responsible if we can’t provide the Service due to
          uncontrollable events like war, riots, natural disasters, national
          emergencies, or unsolvable technical issues.
          {'\n\n'}
          2. We’re not liable for interruptions or issues caused by your actions
          or telecom carriers’ failures.
          {'\n\n'}
          3. We’re not responsible for problems from announced or emergency
          maintenance, repairs, or equipment changes.
          {'\n\n'}
          4. We don’t guarantee specific results (like scores or ranks) and
          aren’t liable for damages from your Service choices.
          {'\n\n'}
          5. We’re not responsible for issues from your info changes.
          {'\n\n'}
          6. Your Device or network problems aren’t our fault.
          {'\n\n'}
          7. We don’t mediate or cover damages from User or third-party disputes
          via our Service.
          {'\n\n'}
          8. Free services/content are excluded from damage claims, unless we
          caused harm intentionally or through gross negligence.
        </StyledTypography>
      </Section>

      <Section>
        <Title>Content Copyrights</Title>
        <StyledTypography>
          1. Your posted content is protected by the Copyright Act. Our created
          content’s intellectual property belongs to us.
          {'\n\n'}
          2. You allow us to use your posted content globally for:
          {'\n\n'}
          1) Copying, editing, displaying, sending, distributing, publishing, or
          making derivative/edited works in the Service
          {'\n'}
          2) Similar uses in our related services
          {'\n'}
          3) Sharing with partners like mobile carriers (SKT, KT, LGT) or web
          platforms for commercial/non-commercial use, without your personal
          info unless you agree
          {'\n\n'}
          3. For other commercial uses, we’ll get your consent via phone, email,
          or fax and may offer compensation.
          {'\n\n'}
          4. We may delete, move, or reject content violating our Your
          Responsibilities section without notice.
          {'\n\n'}
          5. If you edit our or partners’ content to make a new work, you can
          create, post, or delete it, but other rights stay with the original
          rights holder.
          {'\n\n'}
          6. Don’t infringe others’ rights. You’re fully liable for copyright
          disputes from your uploads.
        </StyledTypography>
      </Section>

      <Section>
        <Title>Legal Jurisdiction and Governing Law</Title>
        <StyledTypography>
          1. Disputes between you and us go to courts under the Civil Procedure
          Act and related laws.
          {'\n\n'}
          2. South Korean law applies to these disputes.
          {'\n\n'}
          Effective: February 6, 2025
          {'\n'}
          Announced: February 6, 2025
          {'\n'}
          Effective Start: February 6, 2025
        </StyledTypography>
      </Section>
      <View style={{height: 40}} />
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
