import React from "react";
import "./sideMenu.css";
import { Link as OriginalLink } from "react-router-dom";
import { useState, Fragment } from "react";
import styled from "@emotion/styled";
import { css } from "@emotion/react";
import { useLocation, useNavigate } from "react-router-dom";

interface Group {
  name: string;
  icon: string;
  path?: string;
  links: Array<{
    name: string;
    path: string;
    isExternal?: boolean; // 外部リンクかどうか
    description?: string; // 説明文を表示する場合
  }>;
}

const groups: Array<Group> = [
  {
    name: "ホーム",
    icon: "fa-solid fa-house",
    path: "/",
    links: [],
  },
  {
    name: "マスタ",
    icon: "fa-solid fa-database",
    links: [
      { name: "部品", path: "/parts" },
      // { name: "部品編集", path: "/EditParts" },
      { name: "工程", path: "/processes" },
      // { name: "工程編集", path: "/EditProcesses" },
    ],
  },
  {
    name: "構成",
    icon: "fa-solid fa-sitemap",
    path: "/BomEditor",
    links: [],
  },
  {
    name: "入荷",
    icon: "fa-solid fa-truck-arrow-right",
    path: "/ImportParts",
    links: [],
  },
  {
    name: "出荷",
    icon: "fa-solid fa-regular fa-box",
    path: "/ExportParts",
    links: [],
  },
  {
    name: "組立",
    icon: "fa-solid fa-cogs",
    path: "/MakeRecord",
    links: [],
  },
  {
    name: "在庫",
    icon: "fa-solid fa-warehouse",
    path: "/Inventory",
    links: [],
  },
];

const Wrapper = styled.div`
  height: 100%;
  width: 100%;
  padding: 12px 0 30px;
  margin: 0;
  background-color: white;
  overflow-y: auto;
  box-shadow: 0 0 10px rgba(0, 0, 0, 0.1);
`;

// グループ。展開･縮小を行うのでボタンとして定義。hoverするとふわっと色がつくようなスタイルになってます。
const Group = styled.button<{ active?: boolean }>`
  position: relative;
  display: flex;
  align-items: center;
  justify-content: center;
  width: 100%;
  margin-top: 4px;
  padding: 12px 14px;
  border-radius: 0 30px 30px 0;
  border: none;
  background-color: transparent;
  text-align: left;
  font-size: var(--font-large);
  font-weight: var(--font-bold);
  cursor: pointer;
  padding: 16px 20px;
  color: ${(props) => (props.active ? "var(--hover-color)" : "#555555")};
  transition:
    background-color 0.2s ease-out,
    color 0.2s ease-out;

  &::before {
    content: "";
    position: absolute;
    left: 0;
    top: 0;
    width: 4px;
    height: 100%;
    border-radius: 0 8px 8px 0;
    background-color: ${(props) =>
      props.active ? "var(--accent-color)" : "transparent"};
  }

  &:hover i {
    color: var(--accent-color);
  }
  &:hover {
    color: var(--hover-color);
  }
`;

const Icon = styled.i<{ active?: boolean }>`
  position: absolute;
  left: 20px;
  font-size: 20px;
  color: ${(props) => (props.active ? "var(--accent-color)" : "#333")};
  flex: 0 0 0 20px;
  width: 20px;
  height: 20px;
`;

// よくある「くの字」。展開･縮小を分かりやすくするため。
const ToggleIcon = styled.div<{ open: boolean }>`
  position: absolute;
  right: 20px;
  margin-left: auto; // 右端に寄せる
  color: #333;
  &::before {
    content: "";
    width: 5px;
    height: 5px;
    border-top: solid 2px var(--gray);
    border-right: solid 2px var(--gray);
    position: absolute;
    top: 0;
    left: 0;
    transform: ${(props) => (props.open ? "rotate(135deg)" : "rotate(45deg)")};
  }
`;

const Links = styled.div<{ open: boolean }>`
  position: relative;
  display: flex;
  flex-direction: column;
  gap: 4px;
  background-color: var(--secondary);
  height: 0; // デフォルトで0pxの高さ
  padding: ${(props) => (props.open ? "8px 4px 10px" : "0")}; // 展開時のみ余白
  opacity: ${(props) => (props.open ? 1 : 0)}; // ふわっと表示
  overflow: hidden;
  transition: all 0.2s ease-out;

  ${(props) =>
    props.open
      ? `
        height: auto; 
        height: calc-size(auto, size); /* height: auto を transition させる */
      `
      : ""};
`;

// リンクテキストの共通スタイル
const linkStyle = css`
  font-size: var(--font-medium);
  font-weight: var(--font-semi-bold);
  transition: opacity 0.1s ease-out;
  &:hover {
    opacity: 0.7; // ふわっと
  }
`;

// SPAリンク
const Link = styled(OriginalLink)<{ active?: boolean }>`
  display: block;
  width: 100%;
  text-decoration: none;
  color: ${(props) => (props.active ? "var(--hover-color)" : "#555555")};
  text-align: center;
  position: relative;
  padding: 8px 0;
  font-weight: ${(props) =>
    props.active ? "var(--font-bold)" : "var(--font-semi-bold)"};
  ${linkStyle};
`;

// 外部リンク
const ExternalLink = styled.a<{ active?: boolean }>`
  display: block;
  width: 100%;
  text-decoration: none;
  color: ${(props) => (props.active ? "var(--accent-color)" : "inherit")};
  position: relative;
  font-weight: ${(props) =>
    props.active ? "var(--font-bold)" : "var(--font-semi-bold)"};
  transition:
    opacity 0.1s ease-out,
    color 0.2s ease-out;
  ${linkStyle}
`;

// 説明文
const Description = styled.p`
  padding: 8px 12px;
  background-color: var(--secondary);
  border-radius: 10px;
  font-size: var(--font-default);
  line-height: 1.5;
`;

const SideMenu: React.FC = () => {
  const [openState, setOpenState] = useState<Set<number>>(new Set());
  const location = useLocation();
  const navigate = useNavigate();
  const currentPath = location.pathname;

  const isGroupActive = (group: Group) => {
    if (group.path) {
      return currentPath === group.path;
    }
    return group.links.some((link) => link.path === currentPath);
  };
  const isLinkActive = (path: string) => {
    return currentPath === path;
  };

  const toggleGroup = (index: number) => {
    setOpenState((prev) => {
      const newState = new Set(prev);
      if (newState.has(index)) {
        newState.delete(index);
      } else {
        newState.add(index);
      }
      return newState;
    });
  };
  const handleGroupClick = (index: number, group: Group) => {
    if (group.links.length === 0 && group.path) {
      navigate(group.path);
    } else {
      toggleGroup(index);
    }
  };

  return (
    <Wrapper>
      {groups.map((group, index) => (
        <Fragment key={group.name}>
          <Group
            active={isGroupActive(group)}
            onClick={() => handleGroupClick(index, group)}
          >
            <Icon
              active={isGroupActive(group)}
              className={group.icon}
              aria-hidden="true"
            />
            <span>{group.name}</span>
            <ToggleIcon
              open={openState.has(index)}
              style={{
                visibility: group.links.length > 0 ? "visible" : "hidden",
              }}
            />
          </Group>

          <Links open={openState.has(index)}>
            {group.links.map((link) => (
              <Fragment key={link.path}>
                {link.isExternal ? (
                  // 外部リンク
                  <ExternalLink
                    href={link.path}
                    target="_blank"
                    rel="noopener"
                    active={isLinkActive(link.path)}
                    // グループが閉じているときにタブのフォーカスを当てない
                    tabIndex={openState.has(index) ? 0 : -1}
                  >
                    {link.name}
                  </ExternalLink>
                ) : (
                  // SPA遷移
                  <Link
                    to={link.path}
                    active={isLinkActive(link.path)}
                    // グループが閉じているときにタブのフォーカスを当てない
                    tabIndex={openState.has(index) ? 0 : -1}
                  >
                    {link.name}
                  </Link>
                )}

                {link.description && (
                  <Description>{link.description}</Description>
                )}
              </Fragment>
            ))}
          </Links>
        </Fragment>
      ))}
    </Wrapper>
  );
};

export default SideMenu;
