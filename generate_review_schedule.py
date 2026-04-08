#!/usr/bin/env python3
"""
生成间隔复习计划

基于艾宾浩斯遗忘曲线和间隔重复理论，
为学习的主题生成最优复习时间点。
"""

import json
import argparse
from datetime import datetime, timedelta
from pathlib import Path


# 默认复习间隔（天）
DEFAULT_INTERVALS = [1, 3, 7, 14, 30, 60]


def generate_schedule(start_date: datetime, topic: str, intervals: list = None) -> dict:
    """
    生成复习计划
    
    Args:
        start_date: 学习开始日期
        topic: 学习主题
        intervals: 复习间隔天数列表
    
    Returns:
        包含复习计划的字典
    """
    if intervals is None:
        intervals = DEFAULT_INTERVALS
    
    schedule = {
        "topic": topic,
        "start_date": start_date.strftime("%Y-%m-%d"),
        "created_at": datetime.now().strftime("%Y-%m-%d %H:%M"),
        "reviews": []
    }
    
    for i, days in enumerate(intervals, 1):
        review_date = start_date + timedelta(days=days)
        schedule["reviews"].append({
            "round": i,
            "days_after": days,
            "date": review_date.strftime("%Y-%m-%d"),
            "completed": False,
            "notes": ""
        })
    
    return schedule


def print_schedule(schedule: dict):
    """打印复习计划"""
    print(f"\n📚 主题: {schedule['topic']}")
    print(f"📅 学习日期: {schedule['start_date']}")
    print(f"\n📝 复习计划:")
    print("-" * 50)
    
    for review in schedule["reviews"]:
        status = "✅" if review["completed"] else "⏳"
        print(f"{status} 第 {review['round']} 轮: 学习后 {review['days_after']:2d} 天 "
              f"({review['date']})")
    
    print("-" * 50)
    print("\n💡 复习建议:")
    print("   • 每轮复习先不看资料，尝试主动回忆")
    print("   • 向 Claude 或他人解释概念")
    print("   • 完成知识卡片的自我测试")
    print("   • 记录理解盲点，针对性补强")


def save_schedule(schedule: dict, output_dir: Path = None):
    """保存复习计划到文件"""
    if output_dir is None:
        output_dir = Path.home() / ".rapid-mastery" / "schedules"
    
    output_dir.mkdir(parents=True, exist_ok=True)
    
    # 文件名：主题_开始日期.json
    safe_topic = schedule["topic"].replace(" ", "_").replace("/", "-")
    filename = f"{safe_topic}_{schedule['start_date']}.json"
    filepath = output_dir / filename
    
    with open(filepath, "w", encoding="utf-8") as f:
        json.dump(schedule, f, ensure_ascii=False, indent=2)
    
    print(f"\n💾 计划已保存到: {filepath}")
    return filepath


def list_schedules(schedules_dir: Path = None):
    """列出所有复习计划"""
    if schedules_dir is None:
        schedules_dir = Path.home() / ".rapid-mastery" / "schedules"
    
    if not schedules_dir.exists():
        print("还没有任何复习计划。")
        return
    
    schedules = list(schedules_dir.glob("*.json"))
    
    if not schedules:
        print("还没有任何复习计划。")
        return
    
    print(f"\n📋 所有复习计划 ({len(schedules)} 个):")
    print("-" * 60)
    
    for s in sorted(schedules):
        with open(s, "r", encoding="utf-8") as f:
            data = json.load(f)
        
        completed = sum(1 for r in data["reviews"] if r["completed"])
        total = len(data["reviews"])
        
        print(f"• {data['topic'][:30]:30} | 开始: {data['start_date']} | "
              f"进度: {completed}/{total}")


def mark_completed(topic: str, round_num: int, schedules_dir: Path = None):
    """标记某轮复习已完成"""
    if schedules_dir is None:
        schedules_dir = Path.home() / ".rapid-mastery" / "schedules"
    
    # 查找匹配的计划
    schedules = list(schedules_dir.glob(f"*{topic.replace(' ', '_')}*.json"))
    
    if not schedules:
        print(f"未找到主题 '{topic}' 的复习计划")
        return
    
    # 使用最新的计划
    schedule_file = max(schedules, key=lambda p: p.stat().st_mtime)
    
    with open(schedule_file, "r", encoding="utf-8") as f:
        data = json.load(f)
    
    for review in data["reviews"]:
        if review["round"] == round_num:
            review["completed"] = True
            review["completed_at"] = datetime.now().strftime("%Y-%m-%d %H:%M")
            break
    
    with open(schedule_file, "w", encoding="utf-8") as f:
        json.dump(data, f, ensure_ascii=False, indent=2)
    
    print(f"✅ 已标记 '{data['topic']}' 第 {round_num} 轮复习完成！")


def main():
    parser = argparse.ArgumentParser(
        description="生成和管理间隔复习计划",
        formatter_class=argparse.RawDescriptionHelpFormatter,
        epilog="""
示例:
  # 生成新计划
  python generate_review_schedule.py "Rust Ownership" --start 2024-01-15
  
  # 列出所有计划
  python generate_review_schedule.py --list
  
  # 标记完成
  python generate_review_schedule.py --complete "Rust Ownership" --round 1
        """
    )
    
    parser.add_argument("topic", nargs="?", help="学习主题")
    parser.add_argument("--start", help="开始日期 (YYYY-MM-DD)，默认为今天")
    parser.add_argument("--intervals", nargs="+", type=int, 
                        default=DEFAULT_INTERVALS,
                        help=f"复习间隔天数，默认: {DEFAULT_INTERVALS}")
    parser.add_argument("--save", action="store_true", 
                        help="保存到文件")
    parser.add_argument("--list", action="store_true",
                        help="列出所有计划")
    parser.add_argument("--complete", metavar="TOPIC",
                        help="标记某主题复习完成")
    parser.add_argument("--round", type=int,
                        help="完成的轮次（配合 --complete 使用）")
    
    args = parser.parse_args()
    
    # 列出所有计划
    if args.list:
        list_schedules()
        return
    
    # 标记完成
    if args.complete:
        if not args.round:
            print("错误: 使用 --complete 时必须指定 --round")
            return
        mark_completed(args.complete, args.round)
        return
    
    # 生成新计划
    if not args.topic:
        parser.print_help()
        return
    
    # 解析开始日期
    if args.start:
        start_date = datetime.strptime(args.start, "%Y-%m-%d")
    else:
        start_date = datetime.now()
    
    # 生成计划
    schedule = generate_schedule(start_date, args.topic, args.intervals)
    
    # 打印
    print_schedule(schedule)
    
    # 保存
    if args.save:
        save_schedule(schedule)


if __name__ == "__main__":
    main()
