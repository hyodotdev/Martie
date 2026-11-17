/**
 * @name TabMyTablet
 *
 * 태블릿 화면용 My 탭 컴포넌트
 */
import React, {useState} from 'react';
import {Typography, useCPK, Icon, SwitchToggle} from 'cpk-ui';
import {styled, css} from 'kstyled';
import {Pressable, View} from 'react-native';
import {FlashList} from '@shopify/flash-list';
import SectionHeader from '../components/SectionHeader';
import type {Section} from '../../(tabs)/my';
import {getTabMyAccessibilityLabel} from '../../../src/uis/TabMy/accessibility';

type Props = {
  sections: Section[];
};

export default function TabMyTablet({sections}: Props): JSX.Element {
  const {theme} = useCPK();
  const [expandedIndex, setExpandedIndex] = useState<number | null>(null);

  const renderSections = ({item, index}: {item: Section; index: number}) => {
    const hasToggle = 'isToggle' in item && item.isToggle === true;
    const isExpandable = 'isExpandable' in item && item.isExpandable === true;
    const isExpanded = expandedIndex === index;

    if (isExpandable && 'subSections' in item) {
      return (
        <View>
          <Pressable
            accessibilityLabel={getTabMyAccessibilityLabel(item)}
            accessibilityRole="button"
            accessibilityState={{expanded: isExpanded}}
            onPress={() => setExpandedIndex(isExpanded ? null : index)}
            style={css`
              padding: 20px 24px;
              border-bottom-width: 1px;
              border-bottom-color: ${theme.role.border};
            `}
          >
            <View
              style={css`
                flex-direction: row;
                align-items: center;
                justify-content: space-between;
              `}
            >
              <View
                style={css`
                  flex: 1;
                  gap: 2px;
                `}
              >
                <Typography.Body1
                  style={css`
                    font-size: 18px;
                  `}
                >
                  {item.title}
                </Typography.Body1>
                {item.description && (
                  <Typography.Body3
                    style={css`
                      opacity: 0.5;
                    `}
                  >
                    {item.description}
                  </Typography.Body3>
                )}
              </View>
              <View
                style={{
                  transform: [{rotate: isExpanded ? '90deg' : '0deg'}],
                }}
              >
                <Icon name="CaretRightBold" size={28} />
              </View>
            </View>
          </Pressable>
          {isExpanded &&
            item.subSections.map((sub, i) => (
              <Pressable
                accessibilityLabel={sub.title}
                accessibilityRole="button"
                key={i}
                onPress={sub.onPress}
                style={css`
                  padding: 18px 24px 18px 44px;
                  border-bottom-width: 1px;
                  border-bottom-color: ${theme.role.border};
                  background-color: ${theme.bg.paper};
                `}
              >
                <View
                  style={css`
                    flex-direction: row;
                    align-items: center;
                    justify-content: space-between;
                  `}
                >
                  <Typography.Body1>{sub.title}</Typography.Body1>
                  <Icon name="CaretRightBold" size={22} color={theme.text.placeholder} />
                </View>
              </Pressable>
            ))}
        </View>
      );
    }

    const hasAction = 'onPress' in item && !!item.onPress;

    return (
      <Pressable
        accessibilityLabel={getTabMyAccessibilityLabel(item)}
        accessibilityRole={
          hasToggle ? 'switch' : hasAction ? 'button' : undefined
        }
        accessibilityState={
          hasToggle && 'isOn' in item ? {checked: !!item.isOn} : undefined
        }
        onPress={hasAction ? item.onPress : undefined}
        style={css`
          padding: 20px 24px;
          border-bottom-width: 1px;
          border-bottom-color: ${theme.role.border};
        `}
      >
        <View
          style={css`
            flex-direction: row;
            align-items: center;
            justify-content: space-between;
          `}
        >
          <View
            style={css`
              flex: 1;
              padding-right: 12px;
            `}
          >
            <Typography.Body1
              style={css`
                font-size: 18px;
              `}
            >
              {item.title}
            </Typography.Body1>
            {item.description && (
              <Typography.Body3
                numberOfLines={2}
                style={css`
                  color: ${theme.text.placeholder};
                  margin-top: 4px;
                `}
              >
                {item.description}
              </Typography.Body3>
            )}
          </View>
          <View
            style={css`
              flex-direction: row;
              align-items: center;
              gap: 8px;
            `}
          >
            {item.label && (
              <Typography.Body2
                numberOfLines={1}
                style={css`
                  color: ${item.labelVariant === 'code'
                    ? theme.role.primary
                    : theme.text.placeholder};
                  font-weight: ${item.labelVariant === 'code' ? '800' : '400'};
                  background-color: ${item.labelVariant === 'code'
                    ? `${theme.role.primary}14`
                    : 'transparent'};
                  border-color: ${item.labelVariant === 'code'
                    ? `${theme.role.primary}28`
                    : 'transparent'};
                  border-width: ${item.labelVariant === 'code' ? '1px' : 0};
                  border-radius: ${item.labelVariant === 'code' ? '999px' : 0};
                  padding: ${item.labelVariant === 'code' ? '4px 10px' : 0};
                `}
              >
                {item.label}
              </Typography.Body2>
            )}
            {!hasToggle ? (
              <Icon name="CaretRightBold" size={28} />
            ) : (
              'isOn' in item && (
                <View
                  accessibilityElementsHidden={true}
                  importantForAccessibility="no-hide-descendants"
                  pointerEvents="none"
                >
                  <SwitchToggle
                    isOn={!!item.isOn}
                    style={[
                      css`
                        margin-left: auto;
                      `,
                      {transform: [{scaleX: 1}, {scaleY: 1}]},
                    ]}
                  />
                </View>
              )
            )}
          </View>
        </View>
      </Pressable>
    );
  };

  return (
    <Wrapper>
      <Content>
        <FlashList
          data={sections}
          ListHeaderComponent={SectionHeader}
          renderItem={renderSections}
          extraData={expandedIndex}
        />
      </Content>
    </Wrapper>
  );
}

const Wrapper = styled.View`
  flex: 1;
  align-items: center;
`;

const Content = styled.View`
  max-width: 700px;
  width: 100%;
  flex: 1;
`;
