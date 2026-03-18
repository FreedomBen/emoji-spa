/// Tracks how many times an emoji has been used and when it was last used.
class UsageRecord {
  int count;
  int lastUsed; // milliseconds since epoch

  UsageRecord({
    this.count = 0,
    this.lastUsed = 0,
  });

  factory UsageRecord.fromJson(Map<String, dynamic> json) {
    return UsageRecord(
      count: (json['count'] as num?)?.toInt() ?? 0,
      lastUsed: (json['lastUsed'] as num?)?.toInt() ?? 0,
    );
  }

  Map<String, dynamic> toJson() => {
        'count': count,
        'lastUsed': lastUsed,
      };

  @override
  String toString() => 'UsageRecord(count: $count, lastUsed: $lastUsed)';
}
